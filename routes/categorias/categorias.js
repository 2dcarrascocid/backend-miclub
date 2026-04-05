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
        const { nombre, descripcion, edad_desde, edad_hasta, color, border, background } = body;

        if (!nombre) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'El nombre de la categoría es obligatorio' }),
            };
        }

        const isOwner = await verifyClubAccess(clubId, userId);
        if (!isOwner) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permisos para administrar este club' }),
            };
        }

        // INSERT INTO el_dep_categorias ...
        const { data, error } = await supabase
            .from('el_dep_categorias')
            .insert([{
                id_club: clubId,
                nombre,
                descripcion,
                edad_desde,
                edad_hasta,
                color,
                border,
                background
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

        const isOwner = await verifyClubAccess(clubId, userId);
        if (!isOwner) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permisos para ver este club' }),
            };
        }

        // SELECT * FROM el_dep_categorias WHERE id_club = :id_club ORDER BY edad_desde ASC
        const { data, error } = await supabase
            .from('el_dep_categorias')
            .select('*')
            .eq('id_club', clubId)
            .order('edad_desde', { ascending: true });

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

export const actualizar = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId, id } = event.pathParameters;
        const body = JSON.parse(event.body);
        const { nombre, descripcion, edad_desde, edad_hasta, color, border, background } = body;

        const isOwner = await verifyClubAccess(clubId, userId);
        if (!isOwner) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permisos para administrar este club' }),
            };
        }

        // UPDATE el_dep_categorias SET ... WHERE id = :id
        const updateData = {
            updated_at: new Date().toISOString()
        };
        if (nombre !== undefined) updateData.nombre = nombre;
        if (descripcion !== undefined) updateData.descripcion = descripcion;
        if (edad_desde !== undefined) updateData.edad_desde = edad_desde;
        if (edad_hasta !== undefined) updateData.edad_hasta = edad_hasta;
        if (color !== undefined) updateData.color = color;
        if (border !== undefined) updateData.border = border;
        if (background !== undefined) updateData.background = background;

        const { data, error } = await supabase
            .from('el_dep_categorias')
            .update(updateData)
            .eq('id', id)
            .eq('id_club', clubId) // Ensure it belongs to the club
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

export const eliminar = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId, id } = event.pathParameters;

        const isOwner = await verifyClubAccess(clubId, userId);
        if (!isOwner) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes permisos para administrar este club' }),
            };
        }

        // DELETE FROM el_dep_categorias WHERE id = :id
        const { data, error } = await supabase
            .from('el_dep_categorias')
            .delete()
            .eq('id', id)
            .eq('id_club', clubId) // Ensure it belongs to the club
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
