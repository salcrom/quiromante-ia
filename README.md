# Quiromante IA

PWA de análisis quiromántico asistido por IA, estructurada para separar observación visual, clasificación e interpretación tradicional.

## Estado

- BOOT-001 — Foundation: integrado en `main`.
- M1 — Expedientes: implementación en curso (`feature/m1-expedientes`).

## Stack

- Node.js 22+
- Next.js 16.3.4
- React 19.3
- npm workspaces
- Supabase Auth + PostgreSQL + RLS
- PWA manual con manifest + service worker
- servicios `vision`, `interpretation` y `reporting` desacoplados
- contratos compartidos con Zod

## M1 — Expedientes

Incluye autenticación email/contraseña, expedientes `persons`, creación de `readings`, API tipada, páginas protegidas y endurecimiento RLS.

Para activar Supabase en local copia `apps/web/.env.example` a `.env.local` y completa:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Después aplica las migraciones y ejecuta `npm install && npm run dev`.

## Siguiente hito

M2 — Captura: cámara guiada, Storage privado, upload intents y validación básica de fotografías.
