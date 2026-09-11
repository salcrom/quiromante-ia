import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedContext } from "@/lib/auth";

async function refreshReadingStatus(
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthenticatedContext>>["supabase"]>,
  readingId: string,
) {
  const { data: acceptedPalms } = await supabase
    .from("reading_images")
    .select("hand_side")
    .eq("reading_id", readingId)
    .eq("image_role", "palm")
    .eq("validation_status", "accepted");

  const sides = new Set((acceptedPalms ?? []).map((image) => image.hand_side));
  const status = sides.has("left") && sides.has("right") ? "ready" : "capturing";
  await supabase.from("readings").update({ status, updated_at: new Date().toISOString() }).eq("id", readingId);
  return status;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ readingId: string; imageId: string }> },
) {
  const { readingId, imageId } = await params;
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return apiError("CONFIG_NOT_READY", "Supabase is not configured", 503, true);
  if (!supabase || !user) return apiError("AUTH_REQUIRED", "Authentication required", 401);

  const { data: image } = await supabase
    .from("reading_images")
    .select("id,reading_id,owner_user_id,storage_path,hand_side,image_role")
    .eq("id", imageId)
    .eq("reading_id", readingId)
    .single();

  if (!image || image.owner_user_id !== user.id) return apiError("IMAGE_NOT_FOUND", "Image not found", 404);

  const { error: storageError } = await supabase.storage.from("reading-images").remove([image.storage_path]);
  if (storageError) return apiError("IMAGE_STORAGE_DELETE_FAILED", "Could not remove image from storage", 500, true);

  const { error: deleteError } = await supabase.from("reading_images").delete().eq("id", imageId);
  if (deleteError) return apiError("IMAGE_DELETE_FAILED", "Could not remove image record", 500, true);

  const readingStatus = await refreshReadingStatus(supabase, readingId);
  return apiSuccess({ deletedId: imageId, handSide: image.hand_side, imageRole: image.image_role, readingStatus });
}
