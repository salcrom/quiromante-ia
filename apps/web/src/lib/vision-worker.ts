import { VisionPalmValidationResultSchema } from "@quiromante/contracts";
import { validatePalmWithOpenAI } from "@quiromante/service-vision";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type VisionWorkerOutcome =
  | { status: "idle" }
  | { status: "completed"; runId: string; imageId: string; accepted: boolean }
  | { status: "retry_scheduled"; runId: string; imageId?: string; attempt: number; nextAttemptAt: string; error: string }
  | { status: "failed"; runId: string; imageId?: string; error: string };

function retryDelayMs(attempt: number) {
  const baseMs = 60_000;
  const cappedAttempt = Math.min(Math.max(attempt, 1), 6);
  return baseMs * 2 ** (cappedAttempt - 1);
}

export async function processNextVisionJob(): Promise<VisionWorkerOutcome> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("VISION_WORKER_SUPABASE_NOT_CONFIGURED");

  const nowIso = new Date().toISOString();
  const { data: queued, error: queueError } = await supabase
    .from("image_validation_runs")
    .select("id,reading_image_id,reading_id,owner_user_id,status,request_payload,created_at,attempt_count,max_attempts,next_attempt_at")
    .eq("validator_kind", "anatomical_palm")
    .eq("status", "queued")
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (queueError) throw new Error(`VISION_QUEUE_READ_FAILED:${queueError.message}`);
  if (!queued) return { status: "idle" };

  const attempt = Number(queued.attempt_count ?? 0) + 1;
  const maxAttempts = Number(queued.max_attempts ?? 3);
  const startedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("image_validation_runs")
    .update({
      status: "running",
      started_at: startedAt,
      attempt_count: attempt,
      error_summary: null,
    })
    .eq("id", queued.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();

  if (claimError) throw new Error(`VISION_JOB_CLAIM_FAILED:${claimError.message}`);
  if (!claimed) return { status: "idle" };

  const imageId = queued.reading_image_id as string;

  try {
    const { data: image, error: imageError } = await supabase
      .from("reading_images")
      .select("id,reading_id,owner_user_id,hand_side,image_role,storage_path,mime_type,validation_status")
      .eq("id", imageId)
      .eq("reading_id", queued.reading_id)
      .single();

    if (imageError || !image) throw new Error("VISION_IMAGE_NOT_FOUND");
    if (image.validation_status !== "accepted") throw new Error("VISION_TECHNICAL_VALIDATION_REQUIRED");
    if (image.hand_side !== "left" && image.hand_side !== "right") throw new Error("VISION_HAND_SIDE_UNKNOWN");

    await supabase
      .from("reading_images")
      .update({ anatomical_validation_status: "running" })
      .eq("id", image.id);

    const { data: file, error: downloadError } = await supabase.storage
      .from("reading-images")
      .download(image.storage_path);

    if (downloadError || !file) throw new Error(`VISION_IMAGE_DOWNLOAD_FAILED:${downloadError?.message ?? "unknown"}`);

    const imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const rawResult = await validatePalmWithOpenAI({
      imageId: image.id,
      expectedHandSide: image.hand_side,
      mimeType: image.mime_type,
      imageBase64,
    });

    const parsed = VisionPalmValidationResultSchema.safeParse(rawResult);
    if (!parsed.success) throw new Error(`VISION_RESULT_INVALID:${parsed.error.message}`);
    const result = parsed.data;

    const completedAt = new Date().toISOString();
    await supabase
      .from("image_validation_runs")
      .update({
        status: "completed",
        result_payload: result,
        completed_at: completedAt,
        error_summary: null,
        next_attempt_at: completedAt,
      })
      .eq("id", queued.id);

    await supabase
      .from("reading_images")
      .update({
        anatomical_validation_status: result.accepted ? "accepted" : "rejected",
        anatomical_validation_result: result,
      })
      .eq("id", image.id);

    const { data: palms } = await supabase
      .from("reading_images")
      .select("hand_side,validation_status,anatomical_validation_status")
      .eq("reading_id", queued.reading_id)
      .eq("image_role", "palm");

    const acceptedSides = new Set(
      (palms ?? [])
        .filter((item) => item.validation_status === "accepted" && item.anatomical_validation_status === "accepted")
        .map((item) => item.hand_side),
    );

    const readingStatus = acceptedSides.has("left") && acceptedSides.has("right") ? "ready" : "capturing";
    await supabase
      .from("readings")
      .update({ status: readingStatus, updated_at: completedAt })
      .eq("id", queued.reading_id);

    return { status: "completed", runId: queued.id, imageId: image.id, accepted: result.accepted };
  } catch (error) {
    const message = error instanceof Error ? error.message : "VISION_WORKER_UNKNOWN_ERROR";
    const failedAt = new Date();
    const terminal = attempt >= maxAttempts;

    if (!terminal) {
      const nextAttemptAt = new Date(failedAt.getTime() + retryDelayMs(attempt)).toISOString();
      await supabase
        .from("image_validation_runs")
        .update({
          status: "queued",
          error_summary: message.slice(0, 1000),
          last_error_at: failedAt.toISOString(),
          next_attempt_at: nextAttemptAt,
          completed_at: null,
        })
        .eq("id", queued.id);

      await supabase
        .from("reading_images")
        .update({ anatomical_validation_status: "pending" })
        .eq("id", imageId);

      await supabase
        .from("readings")
        .update({ status: "validating", updated_at: failedAt.toISOString() })
        .eq("id", queued.reading_id);

      return { status: "retry_scheduled", runId: queued.id, imageId, attempt, nextAttemptAt, error: message };
    }

    const completedAt = failedAt.toISOString();
    await supabase
      .from("image_validation_runs")
      .update({
        status: "failed",
        error_summary: message.slice(0, 1000),
        last_error_at: completedAt,
        completed_at: completedAt,
      })
      .eq("id", queued.id);

    await supabase
      .from("reading_images")
      .update({ anatomical_validation_status: "failed" })
      .eq("id", imageId);

    await supabase
      .from("readings")
      .update({ status: "review_required", updated_at: completedAt })
      .eq("id", queued.reading_id);

    return { status: "failed", runId: queued.id, imageId, error: message };
  }
}
