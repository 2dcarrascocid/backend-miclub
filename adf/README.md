# ADF — Agentic Development Framework
## FPlayChile MiClub

Framework de desarrollo agentic para garantizar calidad, trazabilidad y escalabilidad en cada tarea de desarrollo.

---

## Estructura

```
adf/
├── README.md              # Este archivo — documentación del framework
├── contracts/
│   ├── task.schema.json   # Schema de contrato de tarea ADF
│   └── skill_registry.json # Registro completo de skills y sus contratos
├── templates/
│   ├── lambda_handler.js  # Template para nuevos Lambda handlers
│   └── vue_component.vue  # Template para nuevos componentes Vue 3
└── artifacts/             # Registros JSON de ejecución de tareas
    └── .gitkeep
```

---

## Flujo ADF Estándar

```
[1] Recepción de Tarea
         ↓
[2] /adf:orchestrate — Lee la tarea, decide el plan de ataque
         ↓
[3] /adf:plan        — Descompone en pasos atómicos con specialists asignados
         ↓
[4] /specialists:*   — Ejecuta los cambios en el dominio correcto
    ├── backend       → Lambda handlers, Serverless config
    ├── frontend      → Vue 3 components, stores, API client
    ├── database      → Supabase queries, SQL migrations
    ├── payments      → Transbank/Webpay integration
    └── auth          → JWT, API keys, authentication
         ↓
[5] /validators:*    — Verifica calidad, seguridad y contratos
    ├── code          → ES Modules, handler structure, conventions
    ├── security      → OWASP, multitenancy, secrets, payments
    └── api           → REST, YAML config, response structure
         ↓
[6] /observe:log     — Crea artifact JSON de la ejecución
         ↓
[Output + Evidence]
```

---

## Capas del Framework

### Layer 1: Orchestrator
| Skill | Comando | Propósito |
|-------|---------|-----------|
| Orchestrator | `/adf:orchestrate` | Coordina skills, controla flujo, decide qué usar |
| Planner | `/adf:plan` | Descompone tareas en pasos ejecutables con dependencias |

### Layer 2: Specialists
| Skill | Comando | Dominio |
|-------|---------|---------|
| Backend | `/specialists:backend` | `routes/`, `services/`, `utils/` |
| Frontend | `/specialists:frontend` | `../frontend-miclub/src/` |
| Database | `/specialists:database` | Supabase queries, `scripts/*.sql` |
| Payments | `/specialists:payments` | `routes/pagos/`, Transbank SDK |
| Auth | `/specialists:auth` | `routes/login/`, `utils/auth*.js` |

### Layer 3: Validators
| Skill | Comando | Bloquea en |
|-------|---------|-----------|
| Code | `/validators:code` | CRITICAL issues |
| Security | `/validators:security` | CRITICAL + HIGH issues |
| API | `/validators:api` | CRITICAL issues |

### Layer 4: Observability
| Skill | Comando | Output |
|-------|---------|--------|
| Artifact Logger | `/observe:log` | JSON en `adf/artifacts/` |
| Evidence Collector | `/observe:evidence` | Markdown para revisión humana |

---

## Contratos Entre Skills

Cada skill tiene un contrato claro definido en `contracts/skill_registry.json`:

```
Input  → $ARGUMENTS (descripción en lenguaje natural)
Output → Formato estructurado (JSON o artefacto)
Preconditions → Qué debe ser verdad antes de invocarla
Postconditions → Qué garantiza al terminar
```

### Reglas de Desacoplamiento

1. **Todo pasa por el Orchestrator** — No invocar specialists directamente sin plan
2. **Siempre hay validación** — Ninguna tarea finaliza sin al menos 1 validator
3. **Evidencia obligatoria** — Cambios en código → artifact en `adf/artifacts/`
4. **Decoupling** — Ninguna skill conoce o llama a otra skill directamente
5. **Backward compatibility** — No eliminar funcionalidad sin aprobación explícita

---

## Artifacts

Los artifacts en `adf/artifacts/` son la memoria del sistema:

- **Naming**: `{YYYYMMDDHHmmss}-{task-slug}.json`
- **Contenido**: skills usadas, archivos modificados, validaciones, decisiones
- **Schema**: Ver `contracts/task.schema.json`
- **Propósito**: Auditoría, debugging, onboarding de nuevos developers

```bash
# Ver artifacts recientes
ls -la adf/artifacts/ | sort -r | head -10

# Ver detalle de un artifact
cat adf/artifacts/{artifact-id}.json
```

---

## Templates

Los templates en `adf/templates/` aceleran el desarrollo:

- `lambda_handler.js` — Usar como base para nuevos handlers Lambda
- `vue_component.vue` — Usar como base para nuevos componentes Vue 3

Siempre reemplazar los placeholders `{...}` antes de usar.

---

## Cuándo Usar ADF

| Tipo de Tarea | Approach |
|---------------|----------|
| Tarea simple (1 archivo, bajo riesgo) | `/adf:orchestrate` directamente |
| Tarea media (2-5 archivos, riesgo moderado) | `/adf:plan` + specialists + validators |
| Tarea compleja (múltiples capas) | Flujo completo con fases explícitas |
| Hotfix urgente | Specialist directo + `/validators:security` obligatorio |
| Investigación/análisis | Sin ADF — solo lectura de código |

---

## Principios de Diseño

- **Trazabilidad primero** — Cada cambio debe ser rastreable
- **Validación no opcional** — La calidad y seguridad no son features opcionales
- **Specialists especializados** — Cada skill tiene una sola responsabilidad
- **Contratos claros** — Inputs y outputs bien definidos evitan ambigüedad
- **Producción desde el día 1** — Diseñado para escalar, no para demos
