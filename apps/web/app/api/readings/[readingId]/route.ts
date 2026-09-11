import { apiError, apiSuccess } from "@/lib/api-response";
import { getAuthenticatedContext } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ readingId: string }> }) {
  const { readingId } = await params;
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return apiError("CONFIG_NOT_READY", "Supabase is not configured", 503, true);
  if (!supabase || !user) return apiError("AUTH_REQUIRED", "Authentication required", 401);
  const { data, error: queryError } = await supabase.from("readings").select("id,person_id,mode,status,reading_date,active_analysis_run_id,created_at,updated_at,completed_at").eq("id", readingId).single();
  if (queryError || !data) return apiError("READING_NOT_FOUND", "Reading not found", 404);
  return apiSuccess(data);
}
