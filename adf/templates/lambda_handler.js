/**
 * Lambda Handler Template — FPlayChile MiClub
 * ADF Layer: specialists:backend
 *
 * INSTRUCCIONES:
 * 1. Reemplazar {HANDLER_NAME} con el nombre del handler (verbo en español: crear, obtener, actualizar, eliminar, listar)
 * 2. Reemplazar {DOMAIN} con el dominio (jugadores, clubes, eventos, finanzas, etc.)
 * 3. Reemplazar {TABLE_NAME} con el nombre de la tabla Supabase
 * 4. Reemplazar {DESCRIPTION} con una descripción del propósito del handler
 * 5. Ajustar la query Supabase según la operación necesaria
 * 6. Ejecutar /validators:code y /validators:api después de implementar
 */

import { getSupabase } from '../../services/db.js'
import { validateApiKey } from '../../utils/apiKeyMiddleware.js'
import { getUserIdFromToken } from '../../utils/authMiddleware.js'

/**
 * {DESCRIPTION}
 * Domain: {DOMAIN}
 * @param {Object} event - AWS API Gateway HTTP API event
 * @returns {Object} Lambda response with statusCode and JSON body
 */
export const {HANDLER_NAME} = async (event) => {
  // ─── Layer 1: Validate API Key ────────────────────────────────────────────
  const apiKeyError = validateApiKey(event)
  if (apiKeyError) return apiKeyError

  // ─── Layer 2: Authenticate User ──────────────────────────────────────────
  const userId = getUserIdFromToken(event)
  if (!userId) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'No autorizado' })
    }
  }

  try {
    // ─── Layer 3: Parse & Validate Input ─────────────────────────────────
    const body = JSON.parse(event.body || '{}')
    const pathParams = event.pathParameters || {}
    // const queryParams = event.queryStringParameters || {}

    // TODO: Add input validation
    // if (!body.requiredField) {
    //   return {
    //     statusCode: 400,
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ error: 'El campo requiredField es obligatorio' })
    //   }
    // }

    // ─── Layer 4: Get User Club Context ──────────────────────────────────
    const supabase = getSupabase()
    const { data: userClub, error: clubError } = await supabase
      .from('club_users')
      .select('club_id, role')
      .eq('user_id', userId)
      .single()

    if (clubError || !userClub) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Acceso denegado' })
      }
    }

    const { club_id } = userClub

    // ─── Layer 5: Business Logic ──────────────────────────────────────────
    // Template: SELECT — ajustar según la operación
    const { data, error } = await supabase
      .from('{TABLE_NAME}')
      .select('id, campo1, campo2, created_at')  // Especificar columnas, no usar *
      .eq('club_id', club_id)                    // SIEMPRE filtrar por club_id
      .is('deleted_at', null)                    // Excluir soft-deleted si aplica
      .order('created_at', { ascending: false })

    // Template: INSERT
    // const { data, error } = await supabase
    //   .from('{TABLE_NAME}')
    //   .insert({
    //     club_id,
    //     campo: body.campo,
    //     created_at: new Date().toISOString()
    //   })
    //   .select('id, campo')
    //   .single()

    // Template: UPDATE
    // const { data, error } = await supabase
    //   .from('{TABLE_NAME}')
    //   .update({ campo: body.campo })
    //   .eq('id', pathParams.id)
    //   .eq('club_id', club_id)  // Doble filtro para seguridad multitenancy
    //   .select('id, campo')
    //   .single()

    if (error) {
      console.error('[{HANDLER_NAME}] DB error:', error.message)
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Error interno del servidor' })
      }
    }

    // ─── Layer 6: Return Response ─────────────────────────────────────────
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    }

  } catch (err) {
    console.error('[{HANDLER_NAME}] Unexpected error:', err.message)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno del servidor' })
    }
  }
}
