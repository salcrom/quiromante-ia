import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthenticatedContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return <main><p>Supabase no está configurado.</p></main>;
  if (!supabase || !user) redirect("/login");

  const { data: person } = await supabase.from("persons").select("id,alias,dominant_hand,notes,created_at").eq("id", personId).single();
  if (!person) notFound();
  const { data: readings } = await supabase.from("readings").select("id,mode,status,reading_date,updated_at").eq("person_id", personId).order("reading_date", { ascending: false });

  return <main className="grid"><Link className="back" href="/expedientes">← Expedientes</Link><section className="row between"><div><span className="badge">Expediente</span><h1>{person.alias}</h1><p>Mano dominante: {person.dominant_hand === "left" ? "izquierda" : person.dominant_hand === "right" ? "derecha" : "no indicada"}</p></div><Link className="button" href={`/expedientes/${person.id}/lecturas/nueva`}>Nueva lectura</Link></section>{person.notes ? <section className="card"><strong>Notas</strong><p>{person.notes}</p></section> : null}<section className="grid"><h2>Lecturas</h2>{readings?.length ? readings.map((reading) => <Link key={reading.id} className="card person-card" href={`/lecturas/${reading.id}`}><strong>{new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(reading.reading_date))}</strong><span>{reading.mode} · {reading.status}</span></Link>) : <div className="card"><p>Todavía no hay lecturas en este expediente.</p></div>}</section></main>;
}
