import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthenticatedContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ReadingPage({ params }: { params: Promise<{ readingId: string }> }) {
  const { readingId } = await params;
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return <main><p>Supabase no está configurado.</p></main>;
  if (!supabase || !user) redirect("/login");
  const { data: reading } = await supabase.from("readings").select("id,person_id,mode,status,reading_date").eq("id", readingId).single();
  if (!reading) notFound();
  const { data: person } = await supabase.from("persons").select("alias").eq("id", reading.person_id).single();
  return <main className="grid"><Link className="back" href={`/expedientes/${reading.person_id}`}>← {person?.alias ?? "Expediente"}</Link><span className="badge">Lectura · {reading.status}</span><section><h1>{reading.mode === "complete" ? "Lectura completa" : `Lectura ${reading.mode}`}</h1><p>{new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" }).format(new Date(reading.reading_date))}</p></section><section className="card grid"><strong>M1 completado para esta lectura</strong><span>✓ Lectura persistida</span><span>✓ Propiedad protegida por RLS</span><span>✓ Estado inicial: {reading.status}</span><p>El siguiente hito M2 incorporará captura guiada y Storage privado.</p></section></main>;
}
