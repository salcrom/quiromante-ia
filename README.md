# Quiromante IA

PWA de análisis quiromántico asistido por IA, estructurada para separar observación visual, clasificación e interpretación tradicional.

## Estado

- BOOT-001 — Foundation: integrado en `main`.
- M1 — Expedientes, Auth y RLS: integrado en `main`.
- M2 — Captura: en desarrollo (`feature/m2-captura`).

## Stack

- Node.js 22+
- Next.js 16.3.4
- React 19.3
- npm workspaces
- Supabase Auth + PostgreSQL + RLS + Storage privado
- PWA manual con manifest + service worker
- servicios `vision`, `interpretation` y `reporting` desacoplados
- contratos compartidos con Zod

## M2 — Captura

Objetivo: capturar imágenes de ambas palmas desde móvil, mantenerlas privadas y preparar una validación técnica previa al análisis.

Incluye en esta rama:

- cámara/selector de imagen con `capture="environment"`;
- selección de mano izquierda/derecha;
- máximo 15 MB y formatos JPEG, PNG, WebP, HEIC y HEIF;
- bucket privado `reading-images`;
- rutas de Storage segregadas por usuario y lectura;
- upload intents firmados;
- registro `reading_images` protegido por RLS;
- estado de lectura `capturing` durante la captura;
- estado de validación de imagen preparado (`pending`, `accepted`, `rejected`).

Para activar Supabase en local copia `apps/web/.env.example` a `.env.local`, completa las credenciales y aplica las migraciones antes de ejecutar `npm install && npm run dev`.

## Siguiente paso M2

Añadir validación automática básica de calidad (resolución, desenfoque, iluminación y encuadre), gestión de recaptura y transición de la lectura a `ready` cuando se cumpla el mínimo de evidencias exigido.
