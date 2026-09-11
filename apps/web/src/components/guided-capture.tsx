"use client";

import { useEffect, useState } from "react";
import { analyzeCaptureQuality } from "@/lib/capture-quality";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type HandSide = "left" | "right";

type Props = {
  readingId: string;
};

export function GuidedCapture({ readingId }: Props) {
  const [handSide, setHandSide] = useState<HandSide>("left");
  const [status, setStatus] = useState("Haz una foto nítida de la palma completa, con luz uniforme y sin sombras fuertes.");
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function handleRecapture(event: Event) {
      const detail = (event as CustomEvent<{ handSide?: HandSide }>).detail;
      if (detail?.handSide === "left" || detail?.handSide === "right") {
        setHandSide(detail.handSide);
        setIssues([]);
        setStatus(`Sustituye ahora la captura de la mano ${detail.handSide === "left" ? "izquierda" : "derecha"}.`);
      }
    }
    window.addEventListener("quiromante:recapture", handleRecapture);
    return () => window.removeEventListener("quiromante:recapture", handleRecapture);
  }, []);

  async function upload(file: File) {
    setIssues([]);
    if (file.size > 15 * 1024 * 1024) {
      setStatus("La imagen supera el máximo de 15 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)) {
      setStatus("Formato no admitido. Usa JPEG, PNG, WebP, HEIC o HEIF.");
      return;
    }

    setBusy(true);
    try {
      setStatus("Comprobando nitidez, luz, resolución y encuadre…");
      const quality = await analyzeCaptureQuality(file);
      if (!quality.accepted) {
        setIssues(quality.issues);
        setStatus("La foto no supera el control de calidad. Corrige estos puntos y vuelve a capturarla.");
        return;
      }

      setStatus("Calidad correcta. Preparando subida segura…");
      const intentResponse = await fetch(`/api/readings/${readingId}/images`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handSide, imageRole: "palm", fileName: file.name, mimeType: file.type, byteSize: file.size }),
      });
      const intentPayload = await intentResponse.json();
      if (!intentResponse.ok) throw new Error(intentPayload?.error?.message ?? "No se pudo preparar la subida");

      const supabase = createBrowserSupabaseClient();
      if (!supabase) throw new Error("Supabase no está configurado");
      setStatus("Subiendo imagen al almacenamiento privado…");
      const { error: uploadError } = await supabase.storage
        .from("reading-images")
        .uploadToSignedUrl(intentPayload.data.path, intentPayload.data.token, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      setStatus("Validando y registrando captura…");
      const confirmResponse = await fetch(`/api/readings/${readingId}/images`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handSide,
          imageRole: "palm",
          fileName: file.name,
          mimeType: file.type,
          byteSize: file.size,
          storagePath: intentPayload.data.path,
          width: quality.width,
          height: quality.height,
          validationStatus: "accepted",
          quality: {
            brightness: quality.brightness,
            contrast: quality.contrast,
            sharpness: quality.sharpness,
            aspectRatio: quality.aspectRatio,
            issues: quality.issues,
          },
        }),
      });
      const confirmPayload = await confirmResponse.json();
      if (!confirmResponse.ok) throw new Error(confirmPayload?.error?.message ?? "No se pudo registrar la captura");

      const ready = confirmPayload.data?.readingStatus === "ready";
      setStatus(ready
        ? "✓ Ambas palmas cumplen los requisitos. La lectura está lista para análisis."
        : `✓ Palma ${handSide === "left" ? "izquierda" : "derecha"} validada. Captura ahora la otra mano.`);
      setHandSide((current) => current === "left" ? "right" : "left");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error inesperado al procesar la imagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="guided-capture" className="card grid">
      <div>
        <span className="badge">M2 · Captura guiada</span>
        <h2>Fotografía de la palma</h2>
        <p>{status}</p>
        {issues.length > 0 ? (
          <ul>
            {issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        ) : null}
      </div>
      <div className="grid">
        <label>
          Mano
          <select value={handSide} onChange={(event) => setHandSide(event.target.value as HandSide)} disabled={busy}>
            <option value="left">Izquierda</option>
            <option value="right">Derecha</option>
          </select>
        </label>
        <label className="button" aria-disabled={busy}>
          {busy ? "Procesando…" : "Abrir cámara / elegir foto"}
          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      <small>Control previo local: resolución, exposición, contraste, nitidez y proporción de encuadre. La detección anatómica de la palma llegará en la fase de visión.</small>
    </section>
  );
}
