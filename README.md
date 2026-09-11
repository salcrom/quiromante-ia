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

Objetivo: capturar imágenes de ambas palmas desde móvil, mantenerlas privadas y validar técnicamente la calidad antes del análisis.

Incluye en esta rama:

- cámara/selector de imagen con `capture="environment"`;
- selección de mano izquierda/derecha;
- máximo 15 MB y formatos JPEG, PNG, WebP, HEIC y HEIF;
- bucket privado `reading-images`;
- rutas de Storage segregadas por usuario y lectura;
- upload intents firmados;
- registro `reading_images` protegido por RLS;
- control local de resolución, exposición, contraste, nitidez y proporción de encuadre;
- rechazo previo y recaptura cuando la imagen no supera el control técnico;
- transición `capturing` → `validating` → `ready` cuando hay palmas izquierda y derecha válidas;
- trazabilidad básica de métricas de calidad en `validation_notes`;
- previsualización de capturas mediante URLs firmadas temporales;
- eliminación segura de captura en Storage y base de datos;
- sustitución guiada que devuelve la lectura a `capturing` cuando falta una evidencia válida;
- contrato Zod `VisionPalmValidationRequest/Result` para la futura validación anatómica del servicio Vision.

Para activar Supabase en local copia `apps/web/.env.example` a `.env.local`, completa las credenciales y aplica las migraciones antes de ejecutar `npm install && npm run dev`.

## Siguiente paso M2

Conectar el servicio `vision` al contrato anatómico: detectar palma completa, lateralidad, dedos, muñeca, oclusiones y perspectiva; persistir el resultado del validador y decidir si una captura pasa a análisis o requiere nueva toma.
