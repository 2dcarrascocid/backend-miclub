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

export const crear = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;
        const body = JSON.parse(event.body);
        const { nombre_completo, rut, email, telefono, fecha_nacimiento, es_socio, es_jugador, usuario_id } = body;

        if (!nombre_completo) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'El nombre completo es obligatorio' }),
            };
        }

        const isOwner = await verifyClubOwnership(clubId, userId);
        if (!isOwner) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permisos para administrar este club' }),
            };
        }

        let folio = null;
        if (es_jugador) {
            const { data: maxFolioData, error: maxFolioError } = await supabase
                .from('el_dep_jugadores')
                .select('folio')
                .eq('club_id', clubId)
                .not('folio', 'is', null)
                .order('folio', { ascending: false })
                .limit(1);

            if (maxFolioError) throw maxFolioError;

            const currentMax = maxFolioData.length > 0 ? maxFolioData[0].folio : 0;
            folio = currentMax + 1;
        }

        const { data, error } = await supabase
            .from('el_dep_jugadores')
            .insert([{
                club_id: clubId,
                usuario_id: usuario_id || null,
                nombre_completo,
                rut,
                email,
                telefono,
                fecha_nacimiento,
                es_socio: es_socio || false,
                es_jugador: es_jugador || false,
                folio
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



export const listar = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;
        const { next } = event.queryStringParameters || {};

        const isOwner = await verifyClubOwnership(clubId, userId);
        if (!isOwner) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permisos para ver este club' }),
            };
        }

        const limit = 10; // Fixed limit
        const offset = next ? decodeNext(next)?.offset || 0 : 0;

        // Get total count
        const { count, error: countError } = await supabase
            .from('el_dep_jugadores')
            .select('*', { count: 'exact', head: true })
            .eq('club_id', clubId);

        if (countError) throw countError;

        // Get paginated data
        const { data, error } = await supabase
            .from('el_dep_jugadores')
            .select('*')
            .eq('club_id', clubId)
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const nextToken = offset + limit < count ? encodeNext(offset + limit, limit) : null;

        return {
            statusCode: 200,
            body: JSON.stringify({
                data,
                total_jugadores: count,
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

export const buscarJugadores = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;
        const { query } = event.queryStringParameters || {};

        if (!query || query.length < 2) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Debe ingresar al menos 2 caracteres para buscar' }),
            };
        }

        const isOwner = await verifyClubOwnership(clubId, userId);
        if (!isOwner) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permisos para ver este club' }),
            };
        }

        // Search logic: name, rut, phone
        // Using ilike for case-insensitive partial match
        const { data, error } = await supabase
            .from('el_dep_jugadores')
            .select('id, nombre_completo, rut, telefono, folio ')
            .eq('club_id', clubId)
            .or(`nombre_completo.ilike.%${query}%,rut.ilike.%${query}%,telefono.ilike.%${query}%`)
            .limit(20);

        if (error) throw error;

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: error.message === 'Invalid token' || error.message === 'No token provided' ? 401 : 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};
