import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  return (
    <main className="grid">
      <span className="badge">M1 · Expedientes</span>
      <section><h1>Quiromante IA</h1><p>Explora un análisis estructurado, visualmente trazable y revisable de las manos.</p></section>
      <section className="card grid"><strong>{user ? "Tu espacio está preparado" : "Expedientes privados"}</strong><p>{user ? "Crea expedientes separados y abre una nueva lectura. Cada usuario solo puede consultar sus propios datos." : "Accede para crear expedientes separados y protegidos por políticas RLS."}</p><Link className="button" href={user ? "/expedientes" : "/login"}>{user ? "Mis expedientes" : "Entrar o crear cuenta"}</Link></section>
      {!supabase ? <section className="card grid"><strong>Supabase pendiente de enlazar</strong><p>Añade NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para activar autenticación y persistencia.</p></section> : null}
    </main>
  );
}
