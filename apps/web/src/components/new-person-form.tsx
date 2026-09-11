"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function NewPersonForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/persons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        alias: String(form.get("alias") ?? ""),
        dominantHand: String(form.get("dominantHand") ?? "unknown"),
        notes: String(form.get("notes") ?? "") || undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? "No se pudo crear el expediente.");
      setBusy(false);
      return;
    }
    router.push(`/expedientes/${payload.data.id}`);
    router.refresh();
  }

  return (
    <form className="card grid" onSubmit={submit}>
      <label className="field"><span>Alias</span><input name="alias" required maxLength={120} placeholder="Ej. Sergio" /></label>
      <label className="field"><span>Mano dominante</span><select name="dominantHand" defaultValue="unknown"><option value="unknown">No indicada</option><option value="right">Derecha</option><option value="left">Izquierda</option></select></label>
      <label className="field"><span>Notas opcionales</span><textarea name="notes" maxLength={5000} rows={4} /></label>
      {error ? <p className="notice error" role="alert">{error}</p> : null}
      <button type="submit" disabled={busy}>{busy ? "Creando…" : "Crear expediente"}</button>
    </form>
  );
}
