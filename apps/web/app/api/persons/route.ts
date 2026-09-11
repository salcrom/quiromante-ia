import { CreatePersonSchema } from "@quiromante/contracts";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedContext } from "@/lib/auth";

export async function GET(request: Request) {
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return apiError("CONFIG_NOT_READY", "Supabase is not configured", 503, true);
  if (!supabase || !user) return apiError("AUTH_REQUIRED", "Authentication required", 401);
  const url = new URL(request.url);
  const includeArchived = url.searchParams.get("archived") === "true";
  let query = supabase.from("persons").select("id,alias,dominant_hand,notes,created_at,updated_at,archived_at").order("updated_at", { ascending: false });
  if (!includeArchived) query = query.is("archived_at", null);
  const { data, error: queryError } = await query;
  if (queryError) return apiError("INTERNAL_ERROR", "Could not load persons", 500, true);
  return apiSuccess(data ?? []);
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return apiError("CONFIG_NOT_READY", "Supabase is not configured", 503, true);
  if (!supabase || !user) return apiError("AUTH_REQUIRED", "Authentication required", 401);
  const parsed = CreatePersonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_REQUEST", "Invalid person payload", 400, false, parsed.error.flatten());
  const { data, error: insertError } = await supabase.from("persons").insert({ owner_user_id: user.id, alias: parsed.data.alias, dominant_hand: parsed.data.dominantHand, notes: parsed.data.notes ?? null }).select("id,alias,dominant_hand,notes,created_at,updated_at").single();
  if (insertError || !data) return apiError("INTERNAL_ERROR", "Could not create person", 500, true);
  return apiSuccess(data, 201);
}
