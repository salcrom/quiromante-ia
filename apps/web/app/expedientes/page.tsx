import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getAuthenticatedContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ExpedientesPage() {
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return <main className="grid"><h1>Configuración pendiente</h1><p>Conecta Supabase para activar expedientes.</p></main>;
  if (!supabase || !user) redirect("/login");

  const { data: persons } = await supabase.from("persons").select("id,alias,dominant_hand,updated_at,archived_at").is("archived_at", null).order("updated_at", { ascending: false });
  return (
    <main className="grid">
      <nav className="toolbar"><Link href="/">Quiromante IA</Link><SignOutButton /></nav>
      <section className="row between"><div><span className="badge">M1 · Expedientes</span><h1>Expedientes</h1></div><Link className="button" href="/expedientes/nuevo">Nuevo</Link></section>
      {!persons?.length ? <section className="card grid"><strong>Aún no tienes expedientes</strong><p>Crea el primero usando un alias. No necesitas guardar un nombre real.</p><Link className="button" href="/expedientes/nuevo">Crear primer expediente</Link></section> : <section className="grid">{persons.map((person) => <Link className="card person-card" key={person.id} href={`/expedientes/${person.id}`}><strong>{person.alias}</strong><span>Dominante: {person.dominant_hand === "left" ? "izquierda" : person.dominant_hand === "right" ? "derecha" : "no indicada"}</span></Link>)}</section>}
    </main>
  );
}
