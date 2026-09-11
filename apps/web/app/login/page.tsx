import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/expedientes");
  }
  return <main className="grid narrow"><Link href="/" className="back">← Inicio</Link><span className="badge">M1 · Acceso</span><section><h1>Acceso</h1><p>Identifícate para mantener cada expediente separado y protegido mediante RLS.</p></section><AuthForm /></main>;
}
