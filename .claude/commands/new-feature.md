Planifica e implementa una nueva funcionalidad end-to-end de forma estructurada.

## Funcionalidad a Implementar
$ARGUMENTS

---

## Proceso

Este skill activa el flujo ADF completo para features nuevas:

```
1. Análisis de requerimientos
2. Plan técnico (backend + frontend + DB)
3. Implementación por capas
4. Validación
5. Evidencia
```

---

## Fase 1: Análisis de Requerimientos

Antes de escribir código, responder:

- **¿Qué problema resuelve?** — propósito de negocio
- **¿Quién lo usa?** — admin del club, jugador, visitante
- **¿Qué datos involucra?** — tablas existentes o nuevas
- **¿Hay permisos especiales?** — ¿solo admins? ¿solo el propio usuario?
- **¿Hay pagos involucrados?** — Transbank flow
- **¿Rompe algo existente?** — backward compat check

---

## Fase 2: Plan Técnico

### Backend necesario
- [ ] Endpoints nuevos (method + path)
- [ ] Cambios en handlers existentes
- [ ] Ruta registrada en `handler.js` (NO crear YAML nuevo — Lambda monolítica)
- [ ] Cambios de schema DB (nueva tabla, columnas)
- [ ] Migraciones SQL en `sql/` requeridas

### Frontend necesario
- [ ] Vistas nuevas o modificadas
- [ ] Componentes nuevos
- [ ] Cambios en stores
- [ ] Nuevos métodos en `src/api/index.js`
- [ ] Rutas nuevas en el router
- [ ] Si es módulo navegable: entrada en array estático de `Navbar.vue`

### Dependencias entre tareas
- ¿Qué debe estar listo ANTES de que el frontend pueda conectarse?
- ¿Qué puede desarrollarse en paralelo?

---

## Fase 3: Implementación

Usar ADF skills en este orden:

1. **`/specialists:database`** — schema y queries (si hay cambios de DB)
2. **`/specialists:backend`** — handlers y registro en `handler.js`
3. **`/specialists:auth`** — si hay flujos de autenticación nuevos
4. **`/specialists:payments`** — si hay pagos
5. **`/specialists:frontend`** — componentes y vistas
6. **`/validators:code`** — revisión de calidad
7. **`/validators:security`** — siempre si hay auth o pagos
8. **`/validators:api`** — siempre si hay endpoints nuevos
9. **`/observe:log`** — artifact de la feature

---

## Fase 4: Definition of Done

La feature está completa cuando:

- [ ] Backend: todos los endpoints responden con los status codes correctos
- [ ] Frontend: UI conectada al backend real (no mock data)
- [ ] Errores manejados en frontend (loading, error, empty state)
- [ ] Seguridad: multitenancy verificado (club_id siempre filtrado)
- [ ] Todos los validators pasaron
- [ ] Artifact generado en `adf/artifacts/`
- [ ] Sin funcionalidad existente rota

---

## Template de Documentación Rápida

```
### Feature: {nombre}
**Endpoints**: POST /recurso, GET /recurso/{id}
**Tablas afectadas**: tabla1 (nueva), tabla2 (modificada)
**Migración**: sql/add_{descripcion}.sql
**Frontend**: views/NuevaVista.vue, actualiza stores/club.js
**Navbar**: entrada añadida en Navbar.vue (si aplica)
```
