import { supabase } from '../../services/db.js';
import jwt from 'jsonwebtoken';
import { validateApiKey } from '../../utils/apiKeyMiddleware.js';

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

const verifyClubOwnership = async (clubId, userId) => {
    const { data, error } = await supabase
        .from('el_dep_clubes')
        .select('id')
        .eq('id', clubId)
        .eq('admin_id', userId)
        .single();

    if (error || !data) return false;
    return true;
};

export const obtenerResumen = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;

        const isOwner = await verifyClubOwnership(clubId, userId);
        if (!isOwner) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permisos para ver este club' }),
            };
        }

        // 1. Contar Jugadores Activos
        const { count: totalJugadores, error: errorJugadores } = await supabase
            .from('el_dep_jugadores')
            .select('*', { count: 'exact', head: true })
            .eq('club_id', clubId)
            .eq('activo', true)
            .eq('es_jugador', true);

        if (errorJugadores) throw errorJugadores;

        // 2. Contar Socios Activos que NO son Jugadores
        const { count: totalSocios, error: errorSocios } = await supabase
            .from('el_dep_jugadores')
            .select('*', { count: 'exact', head: true })
            .eq('club_id', clubId)
            .eq('activo', true)
            .eq('es_socio', true)
            .eq('es_jugador', false);

        if (errorSocios) throw errorSocios;

        return {
            statusCode: 200,
            body: JSON.stringify({
                total_jugadores_activos: totalJugadores,
                total_socios_no_jugadores: totalSocios
            }),
        };
    } catch (error) {
        return {
            statusCode: error.message === 'Invalid token' || error.message === 'No token provided' ? 401 : 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};
