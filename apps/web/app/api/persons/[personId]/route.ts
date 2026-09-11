import { UpdatePersonSchema } from "@quiromante/contracts";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedContext } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return apiError("CONFIG_NOT_READY", "Supabase is not configured", 503, true);
  if (!supabase || !user) return apiError("AUTH_REQUIRED", "Authentication required", 401);
  const { data, error: queryError } = await supabase.from("persons").select("id,alias,dominant_hand,notes,created_at,updated_at,archived_at").eq("id", personId).single();
  if (queryError || !data) return apiError("PERSON_NOT_FOUND", "Person not found", 404);
  return apiSuccess(data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return apiError("CONFIG_NOT_READY", "Supabase is not configured", 503, true);
  if (!supabase || !user) return apiError("AUTH_REQUIRED", "Authentication required", 401);
  const parsed = UpdatePersonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_REQUEST", "Invalid person payload", 400, false, parsed.error.flatten());
  const patch: Record<string, unknown> = {};
  if (parsed.data.alias !== undefined) patch.alias = parsed.data.alias;
  if (parsed.data.dominantHand !== undefined) patch.dominant_hand = parsed.data.dominantHand;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes || null;
  const { data, error: updateError } = await supabase.from("persons").update(patch).eq("id", personId).select("id,alias,dominant_hand,notes,updated_at").single();
  if (updateError || !data) return apiError("PERSON_NOT_FOUND", "Person not found or not editable", 404);
  return apiSuccess(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return apiError("CONFIG_NOT_READY", "Supabase is not configured", 503, true);
  if (!supabase || !user) return apiError("AUTH_REQUIRED", "Authentication required", 401);
  const { error: deleteError } = await supabase.from("persons").delete().eq("id", personId);
  if (deleteError) return apiError("PERSON_NOT_FOUND", "Person not found or not deletable", 404);
  return apiSuccess({ deleted: true });
}
