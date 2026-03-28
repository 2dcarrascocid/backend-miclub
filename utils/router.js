/**
 * utils/router.js — Lightweight Lambda Router
 *
 * Routes HTTP method + path to the correct handler.
 * No external dependencies — pure Node.js ES Modules.
 *
 * Design decisions:
 * - Route order matters: first match wins.
 *   Put literal paths before parameterized ones (e.g. /buscar before /{id}).
 * - Path parameters use {paramName} syntax matching the existing API contracts.
 * - Enriches event with pathParameters and httpMethod for backward compat.
 */

/**
 * Compiles a route pattern like /clubes/{clubId}/jugadores/{id}
 * into a regex and list of captured parameter names.
 *
 * @param {string} pattern - Route pattern with {param} placeholders
 * @returns {{ regex: RegExp, paramNames: string[] }}
 */
function compilePattern(pattern) {
  const paramNames = []

  const regexStr = pattern
    .split('/')
    .map(segment => {
      if (segment.startsWith('{') && segment.endsWith('}')) {
        paramNames.push(segment.slice(1, -1))
        return '([^/]+)'
      }
      // Escape any special regex chars in literal segments
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('\\/')

  return { regex: new RegExp(`^${regexStr}$`), paramNames }
}

/**
 * Creates a single Lambda handler function that routes all requests.
 *
 * @param {Array<{ method: string, path: string, handler: Function }>} routeDefinitions
 * @returns {Function} Lambda handler: async (event) => { statusCode, body, ... }
 */
export function createRouter(routeDefinitions) {
  // Pre-compile all route patterns at module load time (not per request)
  const compiled = routeDefinitions.map(route => ({
    method: route.method.toUpperCase(),
    handler: route.handler,
    ...compilePattern(route.path),
  }))

  return async function router(event) {
    // ── Normalize method ──────────────────────────────────────────────────
    // HTTP API v2 uses requestContext.http.method
    // REST API v1 uses event.httpMethod
    const method = (
      event.requestContext?.http?.method ||
      event.httpMethod ||
      'GET'
    ).toUpperCase()

    // ── Normalize path ────────────────────────────────────────────────────
    // HTTP API v2: event.rawPath (e.g. "/dev/auth/login" or "/auth/login")
    // serverless-offline with noPrependStage: true: no prefix
    const rawPath = event.rawPath || event.requestContext?.http?.path || event.path || '/'

    // Strip stage prefix added by API Gateway in some configurations
    const path = rawPath.replace(/^\/(dev|prod|staging)(\/|$)/, '/').replace(/\/{2,}/g, '/') || '/'

    // ── Match route ───────────────────────────────────────────────────────
    for (const route of compiled) {
      if (route.method !== method) continue

      const match = path.match(route.regex)
      if (!match) continue

      // Extract path parameters from captured groups
      const pathParameters = {}
      route.paramNames.forEach((name, i) => {
        pathParameters[name] = decodeURIComponent(match[i + 1])
      })

      // Enrich event preserving all original fields:
      // - pathParameters: extracted from this router (overrides API GW proxy param)
      // - httpMethod: normalized, needed by handlers using event.httpMethod (e.g. pagos/commit)
      const enrichedEvent = {
        ...event,
        httpMethod: method,
        pathParameters,
      }

      return route.handler(enrichedEvent)
    }

    // ── 404 — No route matched ────────────────────────────────────────────
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Ruta no encontrada',
        method,
        path,
      }),
    }
  }
}
