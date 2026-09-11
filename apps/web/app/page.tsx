export default function HomePage() {
  return (
    <main className="grid">
      <span className="badge">BOOT-001 · Foundation</span>
      <section>
        <h1>Quiromante IA</h1>
        <p>Explora un análisis estructurado, visualmente trazable y revisable de las manos.</p>
      </section>
      <section className="card grid">
        <strong>Nueva lectura</strong>
        <p>La captura guiada, expedientes y motor de análisis se incorporarán de forma incremental sobre esta base.</p>
        <button type="button" disabled aria-disabled="true">Analizar manos — próximo hito</button>
      </section>
      <section className="card grid">
        <strong>Fundación preparada</strong>
        <span>✓ PWA</span>
        <span>✓ Monorepo</span>
        <span>✓ Contratos y dominio desacoplados</span>
        <span>✓ Supabase preparado</span>
      </section>
    </main>
  );
}
