import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CaptureGallery } from "@/components/capture-gallery";
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
      .select("id,hand_side,image_role,validation_status,anatomical_validation_status,width,height,storage_path,created_at")
      .eq("reading_id", readingId)
      .order("created_at", { ascending: true }),
  ]);

  const technicallyAcceptedSides = new Set(
    (images ?? [])
      .filter((image) => image.image_role === "palm" && image.validation_status === "accepted")
      .map((image) => image.hand_side),
  );

  const anatomicallyAcceptedSides = new Set(
    (images ?? [])
      .filter((image) => image.image_role === "palm" && image.validation_status === "accepted" && image.anatomical_validation_status === "accepted")
      .map((image) => image.hand_side),
  );

  const captures = await Promise.all((images ?? []).map(async (image) => {
    const { data } = await supabase.storage.from("reading-images").createSignedUrl(image.storage_path, 600);
    return {
      id: image.id,
      handSide: image.hand_side as "left" | "right" | "unknown",
      imageRole: image.image_role,
      validationStatus: image.validation_status,
      anatomicalValidationStatus: image.anatomical_validation_status,
      width: image.width,
      height: image.height,
      previewUrl: data?.signedUrl ?? null,
    };
  }));

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
        <span>{technicallyAcceptedSides.has("left") ? "✓" : "○"} Palma izquierda · calidad técnica</span>
        <span>{technicallyAcceptedSides.has("right") ? "✓" : "○"} Palma derecha · calidad técnica</span>
        <span>{anatomicallyAcceptedSides.has("left") ? "✓" : "○"} Palma izquierda · validación anatómica Vision</span>
        <span>{anatomicallyAcceptedSides.has("right") ? "✓" : "○"} Palma derecha · validación anatómica Vision</span>
        <span>{reading.status === "ready" ? "✓ Lectura lista para análisis" : "Faltan evidencias válidas para continuar"}</span>
      </section>

      <GuidedCapture readingId={readingId} />
      <CaptureGallery readingId={readingId} captures={captures} />
    </main>
  );
}
