import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GuidedCapture } from "@/components/guided-capture";
import { getAuthenticatedContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ReadingPage({ params }: { params: Promise<{ readingId: string }> }) {
  const { readingId } = await params;
  const { supabase, user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return <main><p>Supabase no está configurado.</p></main>;
  if (!supabase || !user) redirect("/login");

  const { data: reading } = await supabase
    .from("readings")
    .select("id,person_id,mode,status,reading_date")
    .eq("id", readingId)
    .single();
  if (!reading) notFound();

  const [{ data: person }, { data: images }] = await Promise.all([
    supabase.from("persons").select("alias").eq("id", reading.person_id).single(),
    supabase.from("reading_images").select("id,hand_side,image_role,validation_status,created_at").eq("reading_id", readingId).order("created_at", { ascending: true }),
  ]);

  return (
    <main className="grid">
      <Link className="back" href={`/expedientes/${reading.person_id}`}>← {person?.alias ?? "Expediente"}</Link>
      <span className="badge">Lectura · {reading.status}</span>
      <section>
        <h1>{reading.mode === "complete" ? "Lectura completa" : `Lectura ${reading.mode}`}</h1>
        <p>{new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" }).format(new Date(reading.reading_date))}</p>
      </section>

      <GuidedCapture readingId={readingId} />

      <section className="card grid">
        <strong>Capturas registradas</strong>
        {images?.length ? images.map((image) => (
          <span key={image.id}>✓ {image.hand_side === "left" ? "Mano izquierda" : "Mano derecha"} · {image.image_role} · {image.validation_status}</span>
        )) : <p>Aún no hay fotografías registradas para esta lectura.</p>}
      </section>
    </main>
  );
}
