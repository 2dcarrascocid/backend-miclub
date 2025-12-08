import { supabase } from '../../services/db.js';
import jwt from 'jsonwebtoken';
import { validateApiKey } from '../../utils/apiKeyMiddleware.js';
import { encodeNext, decodeNext } from '../../utils/pagination.js';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access-secret";

const getUserIdFromToken = (event) => {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) throw new Error('No token provided');

    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        return decoded.sub;
    } catch (err) {
        throw new Error('Invalid token');
    }
};

const verifyClubAdmin = async (clubId, userId) => {
    const { data, error } = await supabase
        .from('el_dep_clubes')
        .select('id')
        .eq('id', clubId)
        .eq('admin_id', userId)
        .single();

    return !error && !!data;
};

const verifyClubAccess = async (clubId, userId) => {
    // Check if admin
    if (await verifyClubAdmin(clubId, userId)) return true;

    // Check if player in club linked to user
    const { data, error } = await supabase
        .from('el_dep_jugadores')
        .select('id')
        .eq('club_id', clubId)
        .eq('usuario_id', userId)
        .single();

    return !error && !!data;
};

export const crearMovimiento = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;
        const body = JSON.parse(event.body);
        const { tipo, categoria, monto, descripcion, fecha_movimiento } = body;

        if (!tipo || !monto) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Tipo y monto son obligatorios' }),
            };
        }

        if (!await verifyClubAdmin(clubId, userId)) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'Solo el administrador puede crear movimientos' }),
            };
        }

        const { data, error } = await supabase
            .from('el_dep_movimientos_financieros')
            .insert([{
                club_id: clubId,
                tipo,
                categoria,
                monto,
                descripcion,
                fecha_movimiento: fecha_movimiento || new Date().toISOString(),
                registrado_por: userId
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            statusCode: 201,
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: error.message === 'Invalid token' || error.message === 'No token provided' ? 401 : 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};

export const listarMovimientos = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;
        const { next } = event.queryStringParameters || {};

        if (!await verifyClubAccess(clubId, userId)) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes acceso a los movimientos de este club' }),
            };
        }

        const limit = 10;
        const offset = next ? decodeNext(next)?.offset || 0 : 0;

        // Get total count
        const { count, error: countError } = await supabase
            .from('el_dep_movimientos_financieros')
            .select('*', { count: 'exact', head: true })
            .eq('club_id', clubId);

        if (countError) throw countError;

        const { data: movimientos, error } = await supabase
            .from('el_dep_movimientos_financieros')
            .select('*')
            .eq('club_id', clubId)
            .order('fecha_movimiento', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // Enrich with names
        const playerIds = [...new Set(movimientos.map(m => m.jugador_id).filter(id => id))];
        const registrarUserIds = [...new Set(movimientos.map(m => m.registrado_por).filter(id => id))];

        let namesMap = {};

        const promises = [];

        if (playerIds.length > 0) {
            promises.push(
                supabase
                    .from('el_dep_jugadores')
                    .select('id, nombre_completo')
                    .in('id', playerIds)
                    .then(({ data }) => {
                        if (data) data.forEach(p => namesMap[`player_${p.id}`] = p.nombre_completo);
                    })
            );
        }

        if (registrarUserIds.length > 0) {
            promises.push(
                supabase
                    .from('el_dep_identidades')
                    .select('id, metadata')
                    .in('id', registrarUserIds)
                    .then(({ data }) => {
                        if (data) {
                            data.forEach(u => {
                                // User requested "metadata as nombre". 
                                // metadata is JSONB. We try to extract a name if it's an object, or use it directly if it's a string.
                                let name = u.metadata;
                                if (typeof name === 'object' && name !== null) {
                                    // Common patterns for user metadata
                                    name = name.nombre_completo || name.nombre || name.name || name.full_name || JSON.stringify(name);
                                }
                                namesMap[`user_${u.id}`] = name;
                            });
                        }
                    })
            );
        }

        await Promise.all(promises);

        const enrichedData = movimientos.map(m => ({
            ...m,
            jugador: m.jugador_id ? { nombre_completo: namesMap[`player_${m.jugador_id}`] || 'Desconocido' } : null,
            registrado_por_nombre: namesMap[`user_${m.registrado_por}`] || 'Usuario sin nombre'
        }));

        const nextToken = offset + limit < count ? encodeNext(offset + limit, limit) : null;

        return {
            statusCode: 200,
            body: JSON.stringify({
                data: enrichedData,
                total_registros: count,
                next: nextToken
            }),
        };
    } catch (error) {
        return {
            statusCode: error.message === 'Invalid token' || error.message === 'No token provided' ? 401 : 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};

export const cerrarMes = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;
        const body = JSON.parse(event.body);
        const { mes, anio, observaciones } = body;

        if (!mes || !anio) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Mes y año son obligatorios' }),
            };
        }

        if (!await verifyClubAdmin(clubId, userId)) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'Solo el administrador puede cerrar el mes' }),
            };
        }

        // Calcular totales
        const startDate = new Date(anio, mes - 1, 1).toISOString();
        const endDate = new Date(anio, mes, 1).toISOString(); // First day of next month

        const { data: movimientos, error: movError } = await supabase
            .from('el_dep_movimientos_financieros')
            .select('tipo, monto')
            .eq('club_id', clubId)
            .gte('fecha_movimiento', startDate)
            .lt('fecha_movimiento', endDate);

        if (movError) throw movError;

        let total_ingresos = 0;
        let total_egresos = 0;

        movimientos.forEach(m => {
            if (m.tipo === 'ingreso') total_ingresos += parseFloat(m.monto);
            if (m.tipo === 'egreso') total_egresos += parseFloat(m.monto);
        });

        const saldo_final = total_ingresos - total_egresos;

        const { data, error } = await supabase
            .from('el_dep_cierres_mensuales')
            .insert([{
                club_id: clubId,
                mes,
                anio,
                total_ingresos,
                total_egresos,
                saldo_final,
                observaciones,
                cerrado_por: userId,
                fecha_cierre: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            statusCode: 201,
            body: JSON.stringify(data),
        };

    } catch (error) {
        return {
            statusCode: error.message === 'Invalid token' || error.message === 'No token provided' ? 401 : 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};

export const ingresarMovimientosPorLote = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid JSON body' }),
            };
        }

        // Validate body is an array
        if (!Array.isArray(body)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Body must be an array of movements' }),
            };
        }

        if (!await verifyClubAdmin(clubId, userId)) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'Solo el administrador puede ingresar movimientos por lote' }),
            };
        }

        const movimientosParaInsertar = [];
        const errores = [];

        for (const [index, mov] of body.entries()) {
            const { tipo, categoria, monto, descripcion, fecha_movimiento, jugador_id } = mov;

            // Basic validation logic
            // Requirements: validate fields. If invalid, set to null and report.
            // However, "monto" and "tipo" are likely critical. 
            // User said: "en el caso que un dato no este correctamente ingresado debe ingresar el campo en null y debolver en la respuesta los datos que no se ingresaron correctamente"
            // If "tipo" or "monto" are null, database might reject if they are NOT NULL. 
            // Assuming we follow instructions literally: set them to null.

            const nuevoMovimiento = {
                club_id: clubId,
                registrado_por: userId,
                tipo: tipo,
                categoria: categoria,
                monto: monto,
                descripcion: descripcion,
                fecha_movimiento: fecha_movimiento || new Date().toISOString(),
                jugador_id: jugador_id
            };

            const camposConError = [];

            // Validation Rules
            if (!tipo || !['ingreso', 'egreso'].includes(tipo.toLowerCase())) {
                nuevoMovimiento.tipo = null;
                camposConError.push({ campo: 'tipo', valor: tipo, error: 'Requerido y debe ser ingreso o egreso' });
            }
            if (!monto || isNaN(Number(monto))) {
                nuevoMovimiento.monto = null;
                camposConError.push({ campo: 'monto', valor: monto, error: 'Requerido y debe ser numérico' });
            }
            // Optional validations can be added here, e.g. for categoria, jugador_id date format etc.

            if (camposConError.length > 0) {
                errores.push({ indice: index, datos_originales: mov, errores: camposConError });
            }

            movimientosParaInsertar.push(nuevoMovimiento);
        }

        // Insert individually or batch? 
        // Supabase/PostgREST insert supports batch.
        // However, if we insert a row with NULL in a NOT NULL column, the whole batch might fail or just that row depending on config.
        // If the DB has constraints, NULLs will cause failure. 
        // I will try to insert all. If it fails, I might need to return 500. 
        // The user requirement "ingresar el campo en null" suggests the DB might allow it OR they want us to try.

        const { data, error } = await supabase
            .from('el_dep_movimientos_financieros')
            .insert(movimientosParaInsertar)
            .select();

        if (error) {
            // If error is about constraint violation (e.g. nulls in required fields), we bubble it up
            throw error;
        }

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Proceso completado',
                items_ingresados: data.length,
                detalles_errores_validacion: errores, // return info about what was set to null
                data: data
            }),
        };

    } catch (error) {
        return {
            statusCode: error.message === 'Invalid token' || error.message === 'No token provided' ? 401 : 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};
