"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type HandSide = "left" | "right";

type Props = {
  readingId: string;
};

export function GuidedCapture({ readingId }: Props) {
  const [handSide, setHandSide] = useState<HandSide>("left");
  const [status, setStatus] = useState("Haz una foto nítida de la palma completa, con luz uniforme y sin sombras fuertes.");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      setStatus("La imagen supera el máximo de 15 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)) {
      setStatus("Formato no admitido. Usa JPEG, PNG, WebP, HEIC o HEIF.");
      return;
    }

    setBusy(true);
    setStatus("Preparando subida segura…");
    try {
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

      setStatus("Registrando captura…");
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
        }),
      });
      const confirmPayload = await confirmResponse.json();
      if (!confirmResponse.ok) throw new Error(confirmPayload?.error?.message ?? "No se pudo registrar la captura");

      setStatus(`✓ Palma ${handSide === "left" ? "izquierda" : "derecha"} guardada. Puedes capturar la otra mano.`);
      setHandSide((current) => current === "left" ? "right" : "left");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error inesperado al subir la imagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card grid">
      <div>
        <span className="badge">M2 · Captura guiada</span>
        <h2>Fotografía de la palma</h2>
        <p>{status}</p>
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
      <small>Consejo: encuadra desde la muñeca hasta la punta de los dedos, mantén la mano plana y evita reflejos.</small>
    </section>
  );
}
