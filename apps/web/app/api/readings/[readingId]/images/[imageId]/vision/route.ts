import { VisionPalmValidationRequestSchema } from "@quiromante/contracts";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedContext } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ readingId: string; imageId: string }> },
) {
  const { readingId, imageId } = await params;
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return apiError("CONFIG_NOT_READY", "Supabase is not configured", 503, true);
  if (!supabase || !user) return apiError("AUTH_REQUIRED", "Authentication required", 401);

  const { data: image } = await supabase
    .from("reading_images")
    .select("id,reading_id,owner_user_id,hand_side,image_role,storage_path,validation_status,validation_notes,anatomical_validation_status")
    .eq("id", imageId)
    .eq("reading_id", readingId)
    .single();

  if (!image || image.owner_user_id !== user.id) return apiError("IMAGE_NOT_FOUND", "Image not found", 404);
  if (image.validation_status !== "accepted") {
    return apiError("TECHNICAL_VALIDATION_REQUIRED", "Technical validation must pass before anatomical validation", 409);
  }
  if (image.anatomical_validation_status === "accepted") {
    return apiSuccess({ id: image.id, status: "completed", accepted: true }, 200);
  }

  let notes: Record<string, unknown> = {};
  try {
    notes = image.validation_notes ? JSON.parse(image.validation_notes) as Record<string, unknown> : {};
  } catch {
    notes = {};
  }

  const requestPayload = VisionPalmValidationRequestSchema.safeParse({
    readingId,
    imageId,
    handSide: image.hand_side,
    imageRole: image.image_role,
    storagePath: image.storage_path,
    technicalQuality: {
      brightness: notes.brightness ?? 0,
      contrast: notes.contrast ?? 0,
      sharpness: notes.sharpness ?? 0,
      aspectRatio: notes.aspectRatio ?? 1,
      issues: Array.isArray(notes.issues) ? notes.issues : [],
    },
  });

  if (!requestPayload.success) {
    return apiError("VISION_REQUEST_INVALID", "Could not prepare anatomical validation request", 422, false, requestPayload.error.flatten());
  }

  const { data: existing } = await supabase
    .from("image_validation_runs")
    .select("id,status,created_at")
    .eq("reading_image_id", imageId)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return apiSuccess(existing, 200);

  const { data: run, error: insertError } = await supabase
    .from("image_validation_runs")
    .insert({
      reading_image_id: imageId,
      reading_id: readingId,
      owner_user_id: user.id,
      validator_kind: "anatomical_palm",
      validator_version: "vision-palm-v1",
      status: "queued",
      request_payload: requestPayload.data,
    })
    .select("id,status,validator_kind,validator_version,created_at")
    .single();

  if (insertError || !run) return apiError("VISION_JOB_CREATE_FAILED", "Could not queue anatomical validation", 500, true);

  const timestamp = new Date().toISOString();
  await Promise.all([
    supabase.from("reading_images").update({ anatomical_validation_status: "pending", anatomical_validation_result: null }).eq("id", imageId),
    supabase.from("readings").update({ status: "validating", updated_at: timestamp }).eq("id", readingId),
  ]);

  return apiSuccess(run, 202);
}
