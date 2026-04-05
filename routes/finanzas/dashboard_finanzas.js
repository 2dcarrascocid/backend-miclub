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

export const resumenFinanciero = async (event) => {
    try {
        // Validar API Key
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) {
            return apiKeyValidation.response;
        }

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;

        if (!await verifyClubAccess(clubId, userId)) {
            return {
                statusCode: 403,
                body: JSON.stringify({ message: 'No tienes acceso a la información financiera de este club' }),
            };
        }

        // Obtener todos los movimientos del club (solo campos necesarios)
        const { data: movimientos, error } = await supabase
            .from('el_dep_movimientos_financieros')
            .select('tipo, monto')
            .eq('club_id', clubId);

        if (error) throw error;

        let ingresos = 0;
        let egresos = 0;

        movimientos.forEach(m => {
            const monto = parseFloat(m.monto) || 0;
            if (m.tipo === 'ingreso') {
                ingresos += monto;
            } else if (m.tipo === 'egreso') {
                egresos += monto;
            }
        });

        const balance = ingresos - egresos;

        return {
            statusCode: 200,
            body: JSON.stringify({
                ingresos,
                egresos,
                balance
            }),
        };

    } catch (error) {
        return {
            statusCode: error.message === 'Invalid token' || error.message === 'No token provided' ? 401 : 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};
