"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>, mode: "signin" | "signup") {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setMessage("Supabase todavía no está configurado en este entorno.");
      setBusy(false);
      return;
    }

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        router.push("/expedientes");
        router.refresh();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        router.push("/expedientes");
        router.refresh();
      } else {
        setMessage("Cuenta creada. Revisa tu correo para confirmar el acceso.");
      }
    }
    setBusy(false);
  }

  return (
    <form className="card grid" onSubmit={(event) => submit(event, "signin")}>
      <label className="field">
        <span>Correo</span>
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span>Contraseña</span>
        <input type="password" autoComplete="current-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {message ? <p className="notice" role="status">{message}</p> : null}
      <button type="submit" disabled={busy}>{busy ? "Accediendo…" : "Entrar"}</button>
      <button className="button secondary" type="button" disabled={busy} onClick={(event) => submit(event as unknown as FormEvent<HTMLFormElement>, "signup")}>Crear cuenta</button>
    </form>
  );
}
