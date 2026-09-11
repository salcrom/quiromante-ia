"use client";

import { useState } from "react";

type Capture = {
  id: string;
  handSide: "left" | "right" | "unknown";
  imageRole: string;
  validationStatus: string;
  width: number | null;
  height: number | null;
  previewUrl: string | null;
};

type Props = {
  readingId: string;
  captures: Capture[];
};

export function CaptureGallery({ readingId, captures }: Props) {
  const [items, setItems] = useState(captures);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function removeCapture(capture: Capture, recapture: boolean) {
    setBusyId(capture.id);
    setMessage("");
    try {
      const response = await fetch(`/api/readings/${readingId}/images/${capture.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "No se pudo eliminar la captura");
      setItems((current) => current.filter((item) => item.id !== capture.id));
      if (recapture && capture.handSide !== "unknown") {
        window.dispatchEvent(new CustomEvent("quiromante:recapture", { detail: { handSide: capture.handSide } }));
        setMessage(`Captura eliminada. Haz ahora una nueva foto de la mano ${capture.handSide === "left" ? "izquierda" : "derecha"}.`);
        document.getElementById("guided-capture")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setMessage("Captura eliminada correctamente.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado al eliminar la captura");
    } finally {
      setBusyId(null);
    }
  }

  async function queueVision(capture: Capture) {
    setBusyId(capture.id);
    setMessage("");
    try {
      const response = await fetch(`/api/readings/${readingId}/images/${capture.id}/vision`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "No se pudo preparar la validación anatómica");
      setMessage(`Validación anatómica en cola · ${payload.data?.validatorVersion ?? "vision-palm-v1"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado al preparar Vision");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card grid">
      <div>
        <strong>Capturas registradas</strong>
        <p>Las previsualizaciones usan enlaces temporales sobre Storage privado.</p>
      </div>
      {message ? <p>{message}</p> : null}
      {items.length ? items.map((capture) => (
        <article className="card grid" key={capture.id}>
          {capture.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capture.previewUrl}
              alt={`Palma ${capture.handSide === "left" ? "izquierda" : "derecha"}`}
              style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 12 }}
            />
          ) : <p>Previsualización no disponible.</p>}
          <span>
            {capture.validationStatus === "accepted" ? "✓" : capture.validationStatus === "rejected" ? "✕" : "…"}{" "}
            {capture.handSide === "left" ? "Mano izquierda" : capture.handSide === "right" ? "Mano derecha" : "Mano sin identificar"}
            {capture.width && capture.height ? ` · ${capture.width}×${capture.height}` : ""}
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {capture.validationStatus === "accepted" ? (
              <button disabled={busyId === capture.id} onClick={() => void queueVision(capture)}>
                {busyId === capture.id ? "Procesando…" : "Validar anatomía (Vision)"}
              </button>
            ) : null}
            <button className="button" disabled={busyId === capture.id} onClick={() => void removeCapture(capture, true)}>
              {busyId === capture.id ? "Procesando…" : "Sustituir"}
            </button>
            <button disabled={busyId === capture.id} onClick={() => void removeCapture(capture, false)}>
              Eliminar
            </button>
          </div>
        </article>
      )) : <p>Aún no hay fotografías registradas para esta lectura.</p>}
    </section>
  );
}
