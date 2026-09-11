import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAuthenticatedContext() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { supabase: null, user: null, error: "CONFIG_NOT_READY" as const };
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { supabase, user: null, error: "AUTH_REQUIRED" as const };
  }

  return { supabase, user: data.user, error: null };
}
