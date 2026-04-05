import { supabase } from '../../services/db.js';
import jwt from 'jsonwebtoken';
import { validateApiKey } from '../../utils/apiKeyMiddleware.js';
import { verifyClubAccess } from '../../utils/clubAccess.js';

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


// --- HANDLERS ---

export const crear = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) return apiKeyValidation.response;

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;
        
        const isOwner = await verifyClubAccess(clubId, userId);
        if (!isOwner) return { statusCode: 403, body: JSON.stringify({ message: 'No tienes permisos' }) };

        const body = JSON.parse(event.body);
        const { titulo, descripcion, tipo_evento, fecha_evento, fecha_limite_pago, costo_unitario } = body;

        const { data, error } = await supabase
            .from('el_dep_club_eventos')
            .insert([{
                club_id: clubId,
                titulo,
                descripcion,
                tipo_evento,
                fecha_evento,
                fecha_limite_pago,
                costo_unitario,
                estado: 'borrador'
            }])
            .select()
            .single();

        if (error) throw error;

        return { statusCode: 201, body: JSON.stringify(data) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};

export const actualizar = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) return apiKeyValidation.response;

        const userId = getUserIdFromToken(event);
        const { clubId, id } = event.pathParameters;
        
        const isOwner = await verifyClubAccess(clubId, userId);
        if (!isOwner) return { statusCode: 403, body: JSON.stringify({ message: 'No tienes permisos' }) };

        const body = JSON.parse(event.body);

        // Verificar estado actual
        const { data: currentEvent, error: fetchError } = await supabase
            .from('el_dep_club_eventos')
            .select('estado')
            .eq('id', id)
            .single();
        
        if (fetchError || !currentEvent) throw new Error('Evento no encontrado');
        
        if (currentEvent.estado === 'cerrado') {
            return { statusCode: 400, body: JSON.stringify({ message: 'No se puede editar un evento cerrado' }) };
        }

        const { jugadores, ...bodySinJugadores } = body;
        // Permitir actualizar campos
        const { data, error } = await supabase
            .from('el_dep_club_eventos')
            .update(bodySinJugadores)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return { statusCode: 200, body: JSON.stringify(data) };
    } catch (error) {
        console.error("ERRRORO",error);
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};

export const listar = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) return apiKeyValidation.response;

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;
        const { estado, desde, hasta } = event.queryStringParameters || {};

        const isOwner = await verifyClubAccess(clubId, userId);
        if (!isOwner) return { statusCode: 403, body: JSON.stringify({ message: 'No tienes permisos' }) };

        let query = supabase
            .from('el_dep_club_eventos')
            .select('*')
            .eq('club_id', clubId)
            .order('fecha_evento', { ascending: false });

        if (estado) query = query.eq('estado', estado);
        if (desde) query = query.gte('fecha_evento', desde);
        if (hasta) query = query.lte('fecha_evento', hasta);

        const { data, error } = await query;
        if (error) throw error;

        return { statusCode: 200, body: JSON.stringify(data) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};

export const obtener = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) return apiKeyValidation.response;

        const userId = getUserIdFromToken(event);
        const { clubId, id } = event.pathParameters;

        const isOwner = await verifyClubAccess(clubId, userId);
        if (!isOwner) return { statusCode: 403, body: JSON.stringify({ message: 'No tienes permisos' }) };

        // Obtener evento
        const { data: evento, error: eventError } = await supabase
            .from('el_dep_club_eventos')
            .select('*')
            .eq('id', id)
            .single();

        if (eventError) throw eventError;

        // Obtener jugadores del evento
        const { data: jugadores, error: playersError } = await supabase
            .from('el_dep_club_evento_jugadores')
            .select(`
                *,
                el_dep_jugadores (
                    id,
                    nombre_completo,
                    folio
                )
            `)
            .eq('evento_id', id);

        if (playersError) throw playersError;

        // Calcular resumen
        let total_pagado = 0;
        let total_pendiente = 0;

        const jugadoresFormatted = jugadores.map(j => {
            if (j.estado_pago === 'pagado') {
                total_pagado += (j.monto || 0);
            } else {
                total_pendiente += (j.monto || 0);
            }

            // Calcular estado cumplimiento (simplificado)
            // Si pagado <= fecha_limite -> a_tiempo, else atrasado?
            // User requirement: "Un jugador no es moroso si estado_pago = pagado"
            // "Marca estado_cumplimiento" in register payment step.
            // Here just return what is in DB.
            return {
                jugador_id: j.jugador_id,
                nombre: j.el_dep_jugadores?.nombre_completo,
                numero_jugador: j.numero_jugador, // Or folio from player if not in pivot? Pivot usually has specific number for event? Prompt says "numero_jugador" in body of Add Player.
                estado_pago: j.estado_pago,
                monto: j.monto,
                fecha_pago: j.fecha_pago,
                estado_cumplimiento: j.estado_cumplimiento
            };
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                ...evento,
                resumen: {
                    total_pagado,
                    total_pendiente
                },
                jugadores: jugadoresFormatted
            })
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};

export const agregarJugador = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) return apiKeyValidation.response;

        const userId = getUserIdFromToken(event);
        const { clubId, id } = event.pathParameters;
        
        const isOwner = await verifyClubAccess(clubId, userId);
        if (!isOwner) return { statusCode: 403, body: JSON.stringify({ message: 'No tienes permisos' }) };

        const body = JSON.parse(event.body);
        const { jugador_id, numero_jugador } = body;

        // Obtener evento para ver costo y estado
        const { data: evento, error: eventError } = await supabase
            .from('el_dep_club_eventos')
            .select('*')
            .eq('id', id)
            .single();

        if (eventError || !evento) throw new Error('Evento no encontrado');
        if (evento.estado === 'cerrado') return { statusCode: 400, body: JSON.stringify({ message: 'Evento cerrado' }) };

        // Insertar jugador
        const { data, error } = await supabase
            .from('el_dep_club_evento_jugadores')
            .insert([{
                evento_id: id,
                jugador_id,
                numero_jugador,
                estado_pago: 'pendiente',
                monto: evento.costo_unitario, // Copiar costo
                fecha_limite_pago: evento.fecha_limite_pago // Copiar fecha limite
            }])
            .select()
            .single();

        if (error) throw error;

        return { statusCode: 201, body: JSON.stringify(data) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};

export const quitarJugador = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) return apiKeyValidation.response;

        const userId = getUserIdFromToken(event);
        const { clubId, id, jugadorId } = event.pathParameters;

        const isOwner = await verifyClubAccess(clubId, userId);
        if (!isOwner) return { statusCode: 403, body: JSON.stringify({ message: 'No tienes permisos' }) };

        // Verificar estado evento
        const { data: evento } = await supabase
            .from('el_dep_club_eventos')
            .select('estado')
            .eq('id', id)
            .single();

        if (evento?.estado === 'cerrado') {
            return { statusCode: 400, body: JSON.stringify({ message: 'No se pueden eliminar jugadores de evento cerrado' }) };
        }

        const { error } = await supabase
            .from('el_dep_club_evento_jugadores')
            .delete()
            .eq('evento_id', id)
            .eq('jugador_id', jugadorId);

        if (error) throw error;

        return { statusCode: 200, body: JSON.stringify({ message: 'Jugador eliminado del evento' }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};

export const registrarPago = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) return apiKeyValidation.response;

        const userId = getUserIdFromToken(event);
        const { clubId, id, jugadorId } = event.pathParameters;
        const body = JSON.parse(event.body);
        const { fecha_pago } = body; // e.g., "2025-12-19T18:30:00Z"

        const isOwner = await verifyClubAccess(clubId, userId);
        if (!isOwner) return { statusCode: 403, body: JSON.stringify({ message: 'No tienes permisos' }) };

        // Obtener datos del registro jugador-evento
        const { data: registro, error: regError } = await supabase
            .from('el_dep_club_evento_jugadores')
            .select('*')
            .eq('evento_id', id)
            .eq('jugador_id', jugadorId)
            .single();

        if (regError || !registro) throw new Error('Registro no encontrado');

        // Obtener evento
        const { data: evento } = await supabase
            .from('el_dep_club_eventos')
            .select('estado')
            .eq('id', id)
            .single();
        
        // Calcular cumplimiento
        const fechaPagoDate = new Date(fecha_pago);
        const fechaLimiteDate = registro.fecha_limite_pago ? new Date(registro.fecha_limite_pago) : null;
        
        let estado_cumplimiento = 'a_tiempo';
        if (fechaLimiteDate && fechaPagoDate > fechaLimiteDate) {
            estado_cumplimiento = 'atrasado'; // O el término que prefieran
        }

        // Actualizar registro
        const { error: updateError } = await supabase
            .from('el_dep_club_evento_jugadores')
            .update({
                estado_pago: 'pagado',
                fecha_pago: fecha_pago,
                estado_cumplimiento
            })
            .eq('evento_id', id)
            .eq('jugador_id', jugadorId);

        if (updateError) throw updateError;

        // Si evento cerrado, crear movimiento financiero
        if (evento?.estado === 'cerrado') {
             await supabase
                .from('el_dep_movimientos_financieros')
                .insert([{
                    club_id: clubId,
                    tipo: 'ingreso',
                    monto: registro.monto,
                    descripcion: `Pago tardío evento ${id} - Jugador ${jugadorId}`,
                    fecha_movimiento: new Date().toISOString(),
                    origen_id: id,
                    origen_tipo: 'evento_pago_atrasado'
                }]);
        }

        return { statusCode: 200, body: JSON.stringify({ message: 'Pago registrado', estado_cumplimiento }) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};

export const cerrar = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) return apiKeyValidation.response;

        const userId = getUserIdFromToken(event);
        const { clubId, id } = event.pathParameters;

        const isOwner = await verifyClubAccess(clubId, userId);
        if (!isOwner) return { statusCode: 403, body: JSON.stringify({ message: 'No tienes permisos' }) };

        // Verificar evento
        const { data: evento } = await supabase
            .from('el_dep_club_eventos')
            .select('*')
            .eq('id', id)
            .single();

        if (evento.estado === 'cerrado') return { statusCode: 400, body: JSON.stringify({ message: 'El evento ya está cerrado' }) };

        // Calcular total pagado actual y dividir por cumplimiento
        const { data: pagos, error: pagosError } = await supabase
            .from('el_dep_club_evento_jugadores')
            .select('monto, fecha_pago, fecha_limite_pago')
            .eq('evento_id', id)
            .eq('estado_pago', 'pagado');

        if (pagosError) throw pagosError;

        let totalATiempo = 0;
        let totalAtrasado = 0;

        pagos.forEach(p => {
            const monto = p.monto || 0;
            const fPago = new Date(p.fecha_pago);
            const fLimite = p.fecha_limite_pago ? new Date(p.fecha_limite_pago) : null;

            if (fLimite && fPago > fLimite) {
                totalAtrasado += monto;
            } else {
                totalATiempo += monto;
            }
        });

        // Actualizar evento a cerrado
        const { error: updateError } = await supabase
            .from('el_dep_club_eventos')
            .update({ estado: 'cerrado' })
            .eq('id', id);

        if (updateError) throw updateError;

        // Crear movimientos financieros
        const movimientos = [];
        const now = new Date().toISOString();

        if (totalATiempo > 0) {
            movimientos.push({
                club_id: clubId,
                categoria: 'evento',
                tipo: 'ingreso',
                monto: totalATiempo,
                descripcion: `Cierre evento: ${evento.titulo} (A tiempo)`,
                fecha_movimiento: now,
                origen_id: id,
                origen_tipo: 'evento_cierre'
            });
        }

        if (totalAtrasado > 0) {
            movimientos.push({
                club_id: clubId,
                categoria: 'evento',
                tipo: 'ingreso',
                monto: totalAtrasado,
                descripcion: `Cierre evento: ${evento.titulo} (Pagos Atrasados)`,
                fecha_movimiento: now,
                origen_id: id,
                origen_tipo: 'evento_cierre_atrasado'
            });
        }
        // console.log(movimientos);
        if (movimientos.length > 0) {
            const { error: movError } = await supabase
                .from('el_dep_movimientos_financieros')
                .insert(movimientos);
            
            if (movError) throw movError;
        }

        return { statusCode: 200, body: JSON.stringify({ 
            message: 'Evento cerrado correctamente', 
            total_consolidado: totalATiempo + totalAtrasado,
            detalle: {
                a_tiempo: totalATiempo,
                atrasado: totalAtrasado
            }
        }) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
