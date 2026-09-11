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

  const { data, error: insertError } = await supabase.from("reading_images").insert({
    reading_id: readingId,
    owner_user_id: user.id,
    hand_side: parsed.data.handSide,
    image_role: parsed.data.imageRole,
    storage_path: parsed.data.storagePath,
    mime_type: parsed.data.mimeType,
    byte_size: parsed.data.byteSize,
    width: parsed.data.width ?? null,
    height: parsed.data.height ?? null,
    validation_status: "pending",
  }).select("id,hand_side,image_role,storage_path,validation_status,created_at").single();

  if (insertError || !data) return apiError("IMAGE_REGISTER_FAILED", "Could not register image", 500, true);
  return apiSuccess(data, 201);
}
