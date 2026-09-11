import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NewReadingForm } from "@/components/new-reading-form";
import { getAuthenticatedContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewReadingPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return <main><p>Supabase no está configurado.</p></main>;
  if (!supabase || !user) redirect("/login");
  const { data: person } = await supabase.from("persons").select("id,alias").eq("id", personId).single();
  if (!person) notFound();
  return <main className="grid narrow"><Link className="back" href={`/expedientes/${person.id}`}>← {person.alias}</Link><section><span className="badge">Nueva lectura</span><h1>Elegir modo</h1><p>La lectura quedará vinculada únicamente a este expediente.</p></section><NewReadingForm personId={person.id} /></main>;
}
