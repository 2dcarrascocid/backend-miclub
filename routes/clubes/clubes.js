import { supabase } from '../../services/db.js';
import jwt from 'jsonwebtoken';
import { validateApiKey } from '../../utils/apiKeyMiddleware.js';
import { path } from 'pdfkit';

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
        console.log("userId", userId)
        const body = JSON.parse(event.body);
        const { nombre, descripcion, deporte, path_foto } = body;

        if (!nombre || !deporte) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'El nombre y/o deporte del club es obligatorio' }),
            };
        }

        const { data, error } = await supabase
            .from('el_dep_clubes')
            .insert([{ nombre, descripcion, path_foto, deporte, admin_id: userId }])
            .select()
            .single();

            console.log("data", data);
            console.log("error", error);
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

export const editar = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;
        const body = JSON.parse(event.body);
        const { nombre, descripcion, path_foto, deporte } = body;

        const isOwner = await verifyClubOwnership(clubId, userId);
        if (!isOwner) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permisos para editar este club' }),
            };
        }

        const updates = {};
        if (nombre !== undefined) updates.nombre = nombre;
        if (descripcion !== undefined) updates.descripcion = descripcion;
        if (path_foto !== undefined) updates.path_foto = path_foto;
        if (deporte !== undefined) updates.deporte = deporte;

        console.log("updates", updates)
        if (Object.keys(updates).length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'No se enviaron datos para actualizar' }),
            };
        }

        const { data, error } = await supabase
            .from('el_dep_clubes')
            .update(updates)
            .eq('id', clubId)
            .select()
            .single();

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

export const listar = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);

        const { data, error } = await supabase
            .from('el_dep_clubes')
            .select('*, el_dep_jugadores(count), el_dep_categorias(*)')
            .eq('admin_id', userId)
            .eq('el_dep_jugadores.activo', true)
            .order('edad_desde', { foreignTable: 'el_dep_categorias', ascending: true });

        if (error) throw error;

        const clubs = data.map(club => {
            const count = club.el_dep_jugadores && club.el_dep_jugadores.length > 0 
                ? club.el_dep_jugadores[0].count 
                : 0;
            
            const { el_dep_jugadores, el_dep_categorias, ...clubData } = club;
            return {
                ...clubData,
                cantidad_jugadores: count,
                categorias: el_dep_categorias || []
            };
        });

        return {
            statusCode: 200,
            body: JSON.stringify(clubs),
        };
    } catch (error) {
        return {
            statusCode: error.message === 'Invalid token' || error.message === 'No token provided' ? 401 : 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};
