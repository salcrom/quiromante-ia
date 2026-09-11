import { CreateUploadIntentSchema, RegisterReadingImageSchema } from "@quiromante/contracts";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedContext } from "@/lib/auth";

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-100) || "capture.jpg";
}

async function ownsReading(supabase: NonNullable<Awaited<ReturnType<typeof getAuthenticatedContext>>["supabase"]>, readingId: string) {
  const { data } = await supabase.from("readings").select("id,person_id").eq("id", readingId).single();
  return data;
}

function qualityPasses(input: {
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  aspectRatio: number;
}) {
  const shortest = Math.min(input.width, input.height);
  const longest = Math.max(input.width, input.height);
  return shortest >= 900 &&
    longest >= 1200 &&
    input.brightness >= 55 &&
    input.brightness <= 220 &&
    input.contrast >= 24 &&
    input.sharpness >= 55 &&
    input.aspectRatio >= 0.5 &&
    input.aspectRatio <= 2;
}

export async function POST(request: Request, { params }: { params: Promise<{ readingId: string }> }) {
  const { readingId } = await params;
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return apiError("CONFIG_NOT_READY", "Supabase is not configured", 503, true);
  if (!supabase || !user) return apiError("AUTH_REQUIRED", "Authentication required", 401);

  const body = await request.json().catch(() => null);
  const parsed = CreateUploadIntentSchema.safeParse({ ...body, readingId });
  if (!parsed.success) return apiError("INVALID_REQUEST", "Invalid capture payload", 400, false, parsed.error.flatten());
  if (!(await ownsReading(supabase, readingId))) return apiError("READING_NOT_FOUND", "Reading not found", 404);

  const path = `${user.id}/${readingId}/${crypto.randomUUID()}-${safeFileName(parsed.data.fileName)}`;
  const { data, error: storageError } = await supabase.storage.from("reading-images").createSignedUploadUrl(path);
  if (storageError || !data) return apiError("UPLOAD_INTENT_FAILED", "Could not create upload intent", 500, true);

  await supabase.from("readings").update({ status: "capturing", updated_at: new Date().toISOString() }).eq("id", readingId);
  return apiSuccess({ path, token: data.token });
}

export async function PUT(request: Request, { params }: { params: Promise<{ readingId: string }> }) {
  const { readingId } = await params;
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return apiError("CONFIG_NOT_READY", "Supabase is not configured", 503, true);
  if (!supabase || !user) return apiError("AUTH_REQUIRED", "Authentication required", 401);

  const body = await request.json().catch(() => null);
  const parsed = RegisterReadingImageSchema.safeParse({ ...body, readingId });
  if (!parsed.success) return apiError("INVALID_REQUEST", "Invalid image registration payload", 400, false, parsed.error.flatten());
  if (!(await ownsReading(supabase, readingId))) return apiError("READING_NOT_FOUND", "Reading not found", 404);
  if (!parsed.data.storagePath.startsWith(`${user.id}/${readingId}/`)) return apiError("INVALID_STORAGE_PATH", "Invalid storage path", 400);

  await supabase.from("readings").update({ status: "validating", updated_at: new Date().toISOString() }).eq("id", readingId);

  const accepted = parsed.data.validationStatus === "accepted" && qualityPasses({
    width: parsed.data.width,
    height: parsed.data.height,
    brightness: parsed.data.quality.brightness,
    contrast: parsed.data.quality.contrast,
    sharpness: parsed.data.quality.sharpness,
    aspectRatio: parsed.data.quality.aspectRatio,
  });

  const validationStatus = accepted ? "accepted" : "rejected";
  const validationNotes = JSON.stringify({
    source: "client-quality-gate-v1",
    brightness: parsed.data.quality.brightness,
    contrast: parsed.data.quality.contrast,
    sharpness: parsed.data.quality.sharpness,
    aspectRatio: parsed.data.quality.aspectRatio,
    issues: parsed.data.quality.issues,
  });

  const { data, error: insertError } = await supabase.from("reading_images").insert({
    reading_id: readingId,
    owner_user_id: user.id,
    hand_side: parsed.data.handSide,
    image_role: parsed.data.imageRole,
    storage_path: parsed.data.storagePath,
    mime_type: parsed.data.mimeType,
    byte_size: parsed.data.byteSize,
    width: parsed.data.width,
    height: parsed.data.height,
    validation_status: validationStatus,
    validation_notes: validationNotes,
  }).select("id,hand_side,image_role,storage_path,validation_status,validation_notes,created_at").single();

  if (insertError || !data) {
    await supabase.storage.from("reading-images").remove([parsed.data.storagePath]);
    await supabase.from("readings").update({ status: "capturing", updated_at: new Date().toISOString() }).eq("id", readingId);
    return apiError("IMAGE_REGISTER_FAILED", "Could not register image", 500, true);
  }

  const { data: acceptedPalms } = await supabase
    .from("reading_images")
    .select("hand_side")
    .eq("reading_id", readingId)
    .eq("image_role", "palm")
    .eq("validation_status", "accepted");

  const sides = new Set((acceptedPalms ?? []).map((image) => image.hand_side));
  const readingStatus = sides.has("left") && sides.has("right") ? "ready" : "capturing";
  await supabase.from("readings").update({ status: readingStatus, updated_at: new Date().toISOString() }).eq("id", readingId);

  return apiSuccess({ ...data, readingStatus }, 201);
}
