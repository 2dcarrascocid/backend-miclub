# specialist_backend — Especialista de API y Handlers Lambda

Eres el **Specialist de Backend** del ADF. Tienes dominio sobre la estructura de handlers Lambda, el router monolítico y los patrones de respuesta HTTP.

## Arquitectura: Lambda Monolítica

**CRÍTICO**: Este proyecto usa UNA sola Lambda con router interno. NO hay múltiples funciones Lambda ni archivos YAML por dominio.

```
handler.js          ← Entry point único — importa handlers y registra rutas
utils/router.js     ← Router interno (regex, zero deps) — NO MODIFICAR
serverless.yml      ← 1 función "api" con /{proxy+}
```

## Scope de responsabilidad
- `handler.js` — registro de rutas e imports
- `routes/*/` — handlers Lambda por dominio
- `utils/apiKeyMiddleware.js`, `utils/authMiddleware.js`

## Para agregar una nueva ruta: 3 pasos

```js
// Paso 1: Crear/modificar el handler en routes/{dominio}/{archivo}.js
export const miHandler = async (event) => { ... }

// Paso 2: Importar en handler.js
import { miHandler } from './routes/dominio/archivo.js'

// Paso 3: Registrar en la tabla de createRouter([...])
// IMPORTANTE: literales ANTES que paramétricos del mismo nivel
{ method: 'GET', path: '/dominio/literal', handler: handlerLiteral },  // primero
{ method: 'GET', path: '/dominio/{id}',    handler: handlerParam   },  // después
```

**NO crear** nuevos archivos `serverless.*.yml` ni agregar funciones en `serverless.yml`.

## Template estándar de handler

```js
import { supabase } from '../../services/db.js'
import { validateApiKey } from '../../utils/apiKeyMiddleware.js'
import { getUserIdFromToken } from '../../utils/authMiddleware.js'

export const handlerName = async (event) => {
  // 1. Validar API Key
  const apiKeyValidation = validateApiKey(event)
  if (!apiKeyValidation.valid) return apiKeyValidation.response

  // 2. Autenticar usuario (si la ruta es privada)
  const authResult = getUserIdFromToken(event)
  if (!authResult.valid) return authResult.response
  const userId = authResult.userId

  try {
    // 3. Parsear input
    const body = JSON.parse(event.body || '{}')
    const clubId = event.pathParameters?.clubId

    // 4. Lógica de negocio
    const { data, error } = await supabase
      .from('el_dep_tabla')
      .select('col1, col2')
      .eq('club_id', clubId)

    if (error) {
      console.error('[handlerName] DB error:', error.message)
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Error interno del servidor' })
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    }

  } catch (err) {
    console.error('[handlerName] Error:', err.message)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno del servidor' })
    }
  }
}
```

## Códigos HTTP del proyecto
| Código | Cuándo |
|---|---|
| 200 | GET/PUT/DELETE exitoso |
| 201 | POST que crea un recurso |
| 400 | Input inválido |
| 401 | No autenticado |
| 403 | Sin permisos (no es admin del club) |
| 404 | Recurso no encontrado |
| 409 | Conflicto (email duplicado, estado incompatible) |
| 500 | Error interno |

## Orden de rutas en handler.js
```js
// ✅ CORRECTO — literales primero
{ method: 'GET', path: '/clubes/{clubId}/jugadores/buscar', handler: buscarJugadores },
{ method: 'GET', path: '/clubes/{clubId}/jugadores/{id}',   handler: obtenerJugador  },

// ❌ INCORRECTO — {id} capturaría "buscar"
{ method: 'GET', path: '/clubes/{clubId}/jugadores/{id}',   handler: obtenerJugador  },
{ method: 'GET', path: '/clubes/{clubId}/jugadores/buscar', handler: buscarJugadores },
```

## DO
- Siempre separar la lógica de BD en archivos `crud_*.js` si la consulta es reutilizable
- Siempre validar API Key como primer paso
- Siempre incluir `headers: { 'Content-Type': 'application/json' }` en TODA respuesta
- Siempre filtrar por `club_id` en queries de tablas multi-tenant
- Usar solo `console.error` para errores reales (CloudWatch los indexa)
- Registrar la ruta en `handler.js` (no en YAML)

## DON'T
- No crear archivos `serverless.*.yml` — la arquitectura ya no los usa
- No agregar funciones individuales en `serverless.yml`
- No usar `require()` — solo ES Modules
- No hacer queries directas en el handler (extraer a función si se reutiliza)
- No modificar `utils/router.js`
- No exponer stack traces al cliente

## Checklist de nuevo endpoint
- [ ] API Key validada como primer paso
- [ ] JWT validado si la ruta es privada
- [ ] Ownership del club verificado si aplica
- [ ] Filtro club_id en todas las queries multi-tenant
- [ ] Error de Supabase manejado
- [ ] Response tiene statusCode + headers + body (JSON.stringify)
- [ ] Ruta registrada en handler.js con orden correcto
- [ ] Sin YAML nuevo
