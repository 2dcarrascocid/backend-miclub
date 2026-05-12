# MiClub Backend — Claude Code Guide (ADF)

## Proyecto
**FPlayChile MiClub**: plataforma de gestión para clubes deportivos en Chile.
- Backend: AWS Lambda + Serverless Framework 4.x + Supabase (PostgreSQL)
- Frontend: Vue 3 + Vite (en `../frontend-miclub`)
- Pagos: Transbank/Webpay Plus (Chile)
- Runtime: Node.js >= 22, **ES Modules** — solo `import`/`export`, nunca `require()`

---

## ADF — Agentic Development Framework

Flujo estándar para cualquier tarea compleja:

```
[Task Input]
      ↓
/agent_orchestrator   — Analiza, planifica y coordina
      ↓
/specialist_*         — Ejecuta en el dominio correcto
      ↓
/validator_*          — Valida calidad, seguridad y contratos
      ↓
/observability        — Registra artifact de evidencia
      ↓
[Output + Evidence]
```

## Registro de Skills ADF

| Layer | Skill | Propósito |
|---|---|---|
| Orchestrator | `/agent_orchestrator` | Coordinación central, divide tareas, asegura validación |
| Specialist | `/specialist_auth` | JWT, tokens, sesiones, RBAC |
| Specialist | `/specialist_backend` | Lambda handlers, middlewares, respuestas HTTP |
| Specialist | `/specialist_pagos` | Transbank/Webpay, estados de pago, reconciliación |
| Specialist | `/specialist_db` | Supabase queries, schemas, multi-tenancy |
| Specialist | `/specialist_notifications` | Email SMTP, templates, modos mock |
| Validator | `/validator_security` | OWASP, JWT, SQL injection, datos sensibles |
| Validator | `/validator_api` | Contratos REST, CORS, códigos HTTP |
| Validator | `/validator_data` | Integridad BD, filtros multi-tenant, schemas |
| Observability | `/observability` | Artifact de ejecución, trazabilidad, audit trail |

Módulos runtime ADF: `agent/` (logger, orchestrator, artifacts, validators, contracts).

---

## Reglas del Stack (Siempre Aplican)

### Backend
- **DB**: Solo usar `supabase` de `services/db.js` — cliente singleton
- **Auth**: Validar API Key (`utils/apiKeyMiddleware.js`) ANTES de JWT (`utils/authMiddleware.js`)
- **Handler pattern**: `export const fn = async (event) => { ... }`
- **Response pattern**: `{ statusCode, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': true }, body: JSON.stringify({...}) }`
- **Multitenancy**: Siempre filtrar por `club_id` en queries Supabase
- **Errores**: `console.error` para errores reales en CloudWatch, nunca exponer stack traces al cliente

### Frontend (../frontend-miclub)
- **Vue 3 Composition API** con `<script setup>` — nunca Options API
- **Axios**: siempre desde `src/api/index.js`, nunca instancias directas
- **Estado global**: stores en `src/stores/`
- **Iconos**: Lucide Vue Next únicamente
- **Lazy loading**: todas las rutas deben usar `() => import('@/views/...')`

### Seguridad
- Secrets y API keys siempre en variables de entorno
- Passwords: PBKDF2 + salt (ver `routes/login/funciones.js`) — nunca bcrypt directo
- Refresh tokens: solo hash SHA256 en BD, nunca el token en claro
- Email: siempre normalizar con `normalizeEmail()` antes de consultar BD
- Nunca `v-html` con contenido no sanitizado

---

## Módulos del sistema

| Módulo | Ruta | Tablas principales |
|---|---|---|
| Auth | `routes/login/` | `el_dep_identidades`, `el_dep_sesiones` |
| Clubes | `routes/clubes/` | `el_dep_clubes` |
| Jugadores | `routes/jugadores/` | `el_dep_jugadores` |
| Categorías | `routes/categorias/` | `el_dep_categorias` |
| Eventos | `routes/eventos/` | `el_dep_club_eventos` |
| Membresía | `routes/membresia/` | `el_dep_planes`, `el_dep_club_suscripciones` |
| Pagos | `routes/pagos/` | `el_dep_pagos_webpay` |
| Finanzas | `routes/finanzas/` | `el_dep_club_movimientos_financieros` |
| Notificaciones | `routes/notifications/` | — (email externo) |

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

## Arquitectura Lambda Monolítica

**CRÍTICO**: Una sola función Lambda con router interno. NO existen múltiples funciones Lambda ni YAML por dominio.

```
handler.js          ← Entry point único — imports + createRouter([...])
utils/router.js     ← Router interno regex, sin dependencias — NO MODIFICAR
serverless.yml      ← 1 función "api" con /{proxy+}
```

Para agregar una ruta: (1) crear handler en `routes/`, (2) importar en `handler.js`, (3) registrar en `createRouter([...])`.
**Literales antes que paramétricos** del mismo método y profundidad.

## Estructura del Proyecto

```
backend-miclub/
├── handler.js        # Entry point único — registra todas las rutas
├── routes/           # Lambda handlers organizados por dominio
│   ├── login/        # Autenticación y perfiles
│   ├── clubes/       # Gestión de clubes
│   ├── jugadores/    # Gestión de jugadores + carga masiva
│   ├── invitaciones/ # Invitaciones a clubes
│   ├── finanzas/     # Movimientos financieros y dashboard
│   ├── pagos/        # Transbank/Webpay
│   ├── categorias/   # Categorías de jugadores
│   ├── eventos/      # Eventos y asistencia
│   ├── membresia/    # Planes y suscripciones
│   ├── dashboard/    # Resumen general
│   └── notifications/# Email notifications
├── services/         # Servicios compartidos (db.js, transbankService.js)
├── utils/            # router.js, apiKeyMiddleware.js, authMiddleware.js, pagination.js
├── agent/            # ADF runtime (logger, orchestrator, artifacts, validators, contracts)
├── scripts/          # Build scripts y migraciones SQL
├── sql/              # Schema de base de datos
└── serverless.yml    # 1 función Lambda con /{proxy+}
```

---

## Variables de Entorno Requeridas

```
SUPABASE_URL_LIGA=
SUPABASE_SERVICE_ROLE_KEY_LIGA=
API_KEY=
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
GOOGLE_CLIENT_ID=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
SMTP_FROM=
FRONTEND_URL=
MOCK_EMAIL=false
WEBPAY_HOST=
WEBPAY_API_KEY=
WEBPAY_COMMERCE_CODE=
```

---

## Scripts

```bash
npm run dev              # Serverless offline (puerto 3000)
npm run deploy           # Deploy a AWS
npm run deploy:all       # Deploy + sync Swagger
npm run generate:swagger # Regenerar swagger.json
npm run sync:swagger     # Subir docs a Swagger
```
