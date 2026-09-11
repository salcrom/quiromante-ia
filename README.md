# Quiromante IA

PWA de análisis quiromántico asistido por IA, estructurada para separar observación visual, clasificación e interpretación tradicional.

## Estado

- BOOT-001 — Foundation: integrado en `main`.
- M1 — Expedientes, Auth y RLS: integrado en `main`.
- M2 — Captura + Vision: en desarrollo (`feature/m2-vision-worker`).

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
- la lectura solo pasa a `ready` cuando ambas palmas superan calidad técnica y validación anatómica.

## Configuración del worker

Copia `apps/web/.env.example` a `.env.local` y completa las variables. `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` y `VISION_WORKER_SECRET` son exclusivamente de servidor y nunca deben exponerse al navegador.

`OPENAI_VISION_MODEL` se deja configurable para no acoplar la aplicación a un modelo concreto.

El worker procesa un trabajo por llamada mediante:

```text
POST /api/internal/vision/worker
Authorization: Bearer <VISION_WORKER_SECRET>
```

Puede invocarse desde un cron/runner de confianza. Si no hay trabajos pendientes devuelve estado `idle`.

## Siguiente paso M2

Cerrar el ciclo operativo del worker: automatizar su ejecución programada, añadir reintentos/backoff y mostrar en UI los motivos concretos de rechazo anatómico para guiar la recaptura.
