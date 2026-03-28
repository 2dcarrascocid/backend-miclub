# MiClub Backend — Claude Code Guide (ADF)

## Proyecto
**FPlayChile MiClub**: plataforma de gestión para clubes deportivos en Chile.
- Backend: AWS Lambda + Serverless Framework 4.x + Supabase (PostgreSQL)
- Frontend: Vue 3 + Vite (en `../frontend-miclub`)
- Pagos: Transbank/Webpay Plus (Chile)

---

## ADF — Agentic Development Framework

Este proyecto usa ADF: un sistema de skills organizadas en capas para garantizar trazabilidad, calidad y escalabilidad.

```
[Task Input]
      ↓
/adf:orchestrate   — Lee la tarea, decide el plan
      ↓
/adf:plan          — Descompone en pasos ejecutables
      ↓
/specialists:*     — Ejecuta los cambios (backend | frontend | database | payments | auth)
      ↓
/validators:*      — Valida calidad, seguridad, contratos
      ↓
/observe:log       — Registra artifact de ejecución
      ↓
[Output + Evidence]
```

## Registro de Skills

| Layer | Comando | Propósito |
|-------|---------|-----------|
| Orchestrator | `/adf:orchestrate` | Coordina skills, divide tareas complejas |
| Planner | `/adf:plan` | Descompone tareas en pasos atómicos |
| Specialist | `/specialists:backend` | Lambda handlers, Serverless config |
| Specialist | `/specialists:frontend` | Vue 3 components, stores, API client |
| Specialist | `/specialists:database` | Supabase queries, schema, migraciones |
| Specialist | `/specialists:payments` | Transbank/Webpay integration |
| Specialist | `/specialists:auth` | JWT, API keys, autenticación |
| Validator | `/validators:code` | Calidad, convenciones, ES Modules |
| Validator | `/validators:security` | OWASP, JWT, SQL injection, pagos |
| Validator | `/validators:api` | Contratos REST, YAML, Swagger |
| Observability | `/observe:log` | Artifact JSON de ejecución |
| Observability | `/observe:evidence` | Reporte de evidencia para auditoría |

---

## Reglas del Stack (Siempre Aplican)

### Backend
- **Runtime**: Node.js 22, ES Modules — solo `import`/`export`, nunca `require()`
- **DB**: Solo usar `getSupabase()` de `services/db.js`
- **Auth**: Siempre validar API Key (`utils/apiKeyMiddleware.js`) ANTES de JWT (`utils/authMiddleware.js`)
- **Handler pattern**: `export const fn = async (event) => { ... }`
- **Response pattern**: `{ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...}) }`
- **Multitenancy**: Siempre filtrar por `club_id` en queries Supabase
- **Errores**: `console.error` solo para errores reales, nunca `console.log` en producción

### Frontend
- **Vue 3 Composition API** con `<script setup>` — nunca Options API
- **Axios**: siempre desde `src/api/index.js`, nunca instancias directas
- **Estado global**: stores en `src/stores/`
- **Iconos**: Lucide Vue Next únicamente
- **Lazy loading**: todas las rutas deben usar `() => import('@/views/...')`

### Seguridad
- Secrets y API keys siempre en variables de entorno
- Nunca hardcodear credenciales, IDs o tokens
- Nunca `v-html` con contenido no sanitizado
- Validar inputs en la frontera del sistema (Lambda handler)

---

## Convenciones de Código

- Nombres de archivos JS: `camelCase.js`
- Nombres de archivos YAML: `kebab-case.yml`
- Variables de entorno: `SCREAMING_SNAKE_CASE`
- Rutas API: `/recurso/{id}` (HTTP API Gateway style)
- Verbos para handler exports: `crear`, `obtener`, `actualizar`, `eliminar`, `listar`
- No usar `var` — solo `const`/`let`
- Funciones < 50 líneas cuando sea posible

---

## Estructura del Proyecto

```
backend-miclub/
├── routes/           # Lambda handlers organizados por dominio
│   ├── login/        # Autenticación y perfiles
│   ├── clubes/       # Gestión de clubes
│   ├── jugadores/    # Gestión de jugadores
│   ├── finanzas/     # Movimientos financieros
│   ├── pagos/        # Transbank/Webpay
│   ├── categorias/   # Categorías
│   ├── eventos/      # Eventos
│   ├── membresia/    # Planes y membresías
│   └── notifications/# Email notifications
├── services/         # Servicios compartidos (db.js, etc.)
├── utils/            # Middlewares (apiKeyMiddleware, authMiddleware)
├── scripts/          # Build scripts y migraciones SQL
├── sql/              # Schema de base de datos
├── adf/              # ADF Framework (contratos, templates, artifacts)
│   ├── contracts/    # Schemas de contratos entre skills
│   ├── templates/    # Templates de código reutilizables
│   └── artifacts/    # Registros de ejecución de tareas
└── serverless.yml    # Configuración principal Serverless
```

---

## Variables de Entorno Requeridas

```
# Supabase
SUPABASE_URL_LIGA
SUPABASE_SERVICE_ROLE_KEY_LIGA

# Email
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

# Transbank/Webpay
WEBPAY_HOST, WEBPAY_API_KEY, WEBPAY_COMMERCE_CODE

# Auth
API_KEY
ACCESS_TOKEN_SECRET

# App
FRONTEND_URL
MOCK_EMAIL
```

---

## Estándares de Artifacts

Cada tarea que modifique código debe generar un artifact en `adf/artifacts/`:
- Formato: `{YYYYMMDDHHmmss}-{task-slug}.json`
- Contenido: skills usadas, archivos modificados, decisiones tomadas, resultados de validators
- Ver `adf/contracts/task.schema.json` para el schema completo
