"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function NewReadingForm({ personId }: { personId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/readings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ personId, mode: String(form.get("mode") ?? "complete") }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error?.message ?? "No se pudo crear la lectura.");
      setBusy(false);
      return;
    }
    router.push(`/lecturas/${payload.data.id}`);
    router.refresh();
  }

  return (
    <form className="card grid" onSubmit={submit}>
      <label className="field"><span>Modo</span><select name="mode" defaultValue="complete"><option value="complete">Completo — recomendado</option><option value="quick">Rápido</option><option value="traditional">Tradicional</option><option value="technical">Técnico / forense</option><option value="comparative">Comparativo</option></select></label>
      <p className="muted">La lectura se crea como borrador. La captura guiada se incorporará en M2.</p>
      {error ? <p className="notice error" role="alert">{error}</p> : null}
      <button type="submit" disabled={busy}>{busy ? "Creando…" : "Crear lectura"}</button>
    </form>
  );
}
