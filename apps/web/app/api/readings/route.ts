import { CreateReadingSchema } from "@quiromante/contracts";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedContext } from "@/lib/auth";

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return apiError("CONFIG_NOT_READY", "Supabase is not configured", 503, true);
  if (!supabase || !user) return apiError("AUTH_REQUIRED", "Authentication required", 401);
  const parsed = CreateReadingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_REQUEST", "Invalid reading payload", 400, false, parsed.error.flatten());
  const { data: person } = await supabase.from("persons").select("id").eq("id", parsed.data.personId).single();
  if (!person) return apiError("PERSON_NOT_FOUND", "Person not found", 404);
  const { data, error: insertError } = await supabase.from("readings").insert({ person_id: parsed.data.personId, mode: parsed.data.mode, status: "draft" }).select("id,person_id,mode,status,reading_date,created_at").single();
  if (insertError || !data) return apiError("INTERNAL_ERROR", "Could not create reading", 500, true);
  return apiSuccess(data, 201);
}
