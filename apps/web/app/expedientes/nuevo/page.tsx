import Link from "next/link";
import { redirect } from "next/navigation";
import { NewPersonForm } from "@/components/new-person-form";
import { getAuthenticatedContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewPersonPage() {
  const { user, error } = await getAuthenticatedContext();
  if (error === "CONFIG_NOT_READY") return <main><p>Supabase no está configurado.</p></main>;
  if (!user) redirect("/login");
  return <main className="grid narrow"><Link className="back" href="/expedientes">← Expedientes</Link><section><span className="badge">Nuevo expediente</span><h1>Crear expediente</h1><p>Usa un alias para mantener la privacidad por diseño.</p></section><NewPersonForm /></main>;
}
