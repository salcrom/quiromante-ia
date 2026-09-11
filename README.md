# Quiromante IA

PWA de análisis quiromántico asistido por IA, estructurada para separar observación visual, clasificación e interpretación tradicional.

## Estado

- BOOT-001 — Foundation: integrado en `main`.
- M1 — Expedientes, Auth y RLS: integrado en `main`.
- M2 — Captura + Vision: en desarrollo (`feature/m2-captura`).

## Stack

- Node.js 22+
- Next.js 16.3.4
- React 19.3
- npm workspaces
- Supabase Auth + PostgreSQL + RLS + Storage privado
- PWA manual con manifest + service worker
- servicios `vision`, `interpretation` y `reporting` desacoplados
- contratos compartidos con Zod

## M2 — Captura y validación Vision

Incluye:

- cámara/selector de imagen con `capture="environment"`;
- selección de mano izquierda/derecha;
- máximo 15 MB y formatos JPEG, PNG, WebP, HEIC y HEIF;
- bucket privado `reading-images` y rutas segregadas por usuario/lectura;
- upload intents firmados;
- control local de resolución, exposición, contraste, nitidez y encuadre;
- previsualizaciones mediante URLs firmadas temporales;
- sustitución y eliminación de capturas;
- cola `image_validation_runs` para validación anatómica;
- worker protegido que reclama trabajos en cola, descarga la imagen privada con credenciales de servicio y ejecuta un modelo Vision;
- validación de respuesta con Zod y persistencia del resultado anatómico;
- comprobación de palma, cinco dedos, muñeca/base, lateralidad, oclusiones y perspectiva;
- estados anatómicos `pending`, `running`, `accepted`, `rejected` y `failed`;
- la lectura solo pasa a `ready` cuando ambas palmas superan calidad técnica y validación anatómica;
- reintentos automáticos del worker con backoff exponencial de 1, 2, 4… minutos hasta `max_attempts`;
- ejecución programada mediante GitHub Actions cada 5 minutos con drenaje de hasta 10 trabajos por ciclo.

## Configuración del worker

Copia `apps/web/.env.example` a `.env.local` y completa las variables. `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` y `VISION_WORKER_SECRET` son exclusivamente de servidor y nunca deben exponerse al navegador.

`OPENAI_VISION_MODEL` se deja configurable para no acoplar la aplicación a un modelo concreto.

El worker procesa un trabajo por llamada mediante:

```text
POST /api/internal/vision/worker
Authorization: Bearer <VISION_WORKER_SECRET>
```

Si un intento falla antes de alcanzar `max_attempts`, el trabajo vuelve a `queued` con `next_attempt_at` calculado mediante backoff. Al agotar los intentos pasa a `failed`, la captura queda en error anatómico y la lectura pasa a `review_required`.

## Scheduler / cron

`.github/workflows/vision-worker-cron.yml` ejecuta el worker cada 5 minutos y procesa un máximo de 10 trabajos por ciclo. Configura estos **GitHub Actions repository secrets**:

```text
VISION_WORKER_URL=https://<dominio-desplegado>
VISION_WORKER_SECRET=<el-mismo-secreto-configurado-en-el-servidor>
```

`VISION_WORKER_URL` debe ser únicamente el origen de la aplicación, sin `/api/internal/vision/worker`; el workflow añade esa ruta.

Importante: GitHub ejecuta los eventos `schedule` desde la rama por defecto. Por tanto, el cron quedará operativo automáticamente cuando este workflow llegue a `main`. Antes de la integración puede validarse el código mediante CI, pero el `schedule` no se considera activo en producción.

## Estado operativo de M2

El ciclo de captura → validación técnica → cola Vision → worker → reintentos/backoff → aceptación/rechazo → estado de lectura queda implementado en código. Para producción faltan únicamente acciones de infraestructura externas al repositorio: desplegar la rama integrada, aplicar migraciones `0006` a `0009`, configurar las variables de servidor y crear los dos secrets de GitHub Actions indicados arriba.

## Siguiente paso

Una vez verificado el despliegue real con una palma izquierda y una derecha, cerrar M2 mediante PR/merge a `main` y comenzar M3 sobre análisis quiromántico estructurado a partir de evidencias Vision aceptadas.
