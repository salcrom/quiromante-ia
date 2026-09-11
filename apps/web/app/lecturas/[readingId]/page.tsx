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
    supabase
      .from("reading_images")
      .select("id,hand_side,image_role,validation_status,width,height,created_at")
      .eq("reading_id", readingId)
      .order("created_at", { ascending: true }),
  ]);

  const acceptedSides = new Set(
    (images ?? [])
      .filter((image) => image.image_role === "palm" && image.validation_status === "accepted")
      .map((image) => image.hand_side),
  );

  return (
    <main className="grid">
      <Link className="back" href={`/expedientes/${reading.person_id}`}>← {person?.alias ?? "Expediente"}</Link>
      <span className="badge">Lectura · {reading.status}</span>
      <section>
        <h1>{reading.mode === "complete" ? "Lectura completa" : `Lectura ${reading.mode}`}</h1>
        <p>{new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" }).format(new Date(reading.reading_date))}</p>
      </section>

      <section className="card grid">
        <strong>Requisitos de captura</strong>
        <span>{acceptedSides.has("left") ? "✓" : "○"} Palma izquierda validada</span>
        <span>{acceptedSides.has("right") ? "✓" : "○"} Palma derecha validada</span>
        <span>{reading.status === "ready" ? "✓ Lectura lista para análisis" : "Faltan evidencias válidas para continuar"}</span>
      </section>

      <GuidedCapture readingId={readingId} />

      <section className="card grid">
        <strong>Capturas registradas</strong>
        {images?.length ? images.map((image) => (
          <span key={image.id}>
            {image.validation_status === "accepted" ? "✓" : image.validation_status === "rejected" ? "✕" : "…"}{" "}
            {image.hand_side === "left" ? "Mano izquierda" : "Mano derecha"} · {image.image_role} · {image.validation_status}
            {image.width && image.height ? ` · ${image.width}×${image.height}` : ""}
          </span>
        )) : <p>Aún no hay fotografías registradas para esta lectura.</p>}
      </section>
    </main>
  );
}
