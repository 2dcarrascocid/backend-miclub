import { supabase } from '../../services/db.js';
import jwt from 'jsonwebtoken';
import { validateApiKey } from '../../utils/apiKeyMiddleware.js';
import { sendEmail } from '../notifications/emailService.js';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret';

const getUserIdFromToken = (event) => {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) throw new Error('No token provided');
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        return decoded.sub;
    } catch {
        throw new Error('Invalid token');
    }
};

const verifyClubOwnership = async (clubId, userId) => {
    const { data, error } = await supabase
        .from('el_dep_clubes')
        .select('id, nombre')
        .eq('id', clubId)
        .eq('admin_id', userId)
        .single();
    if (error || !data) return null;
    return data;
};

const authError = (msg) => ({
    statusCode: msg === 'Invalid token' || msg === 'No token provided' ? 401 : 500,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg }),
});

// POST /clubes/{clubId}/invitaciones
export const crear = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) return apiKeyValidation.response;

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;
        const { email } = JSON.parse(event.body || '{}');

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Email inválido o ausente' }),
            };
        }

        const club = await verifyClubOwnership(clubId, userId);
        if (!club) {
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'No tienes permisos para administrar este club' }),
            };
        }

        // Verificar si ya existe invitación pendiente vigente
        const { data: existing } = await supabase
            .from('el_dep_invitaciones')
            .select('id')
            .eq('club_id', clubId)
            .eq('email', email)
            .eq('estado', 'pendiente')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (existing) {
            return {
                statusCode: 409,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Ya existe una invitación pendiente para este email' }),
            };
        }

        const { data: inv, error } = await supabase
            .from('el_dep_invitaciones')
            .insert([{ club_id: clubId, email, creado_por: userId }])
            .select()
            .single();

        if (error) throw error;

        const link = `${process.env.FRONTEND_URL}/invitacion/${inv.token}`;

        await sendEmail({
            to: email,
            subject: `Invitación para administrar ${club.nombre} en MiClub`,
            html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
                    <h2 style="color:#1e40af">Has sido invitado a MiClub</h2>
                    <p>Tienes una invitación para administrar el club <strong>${club.nombre}</strong>.</p>
                    <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#3b82f6;color:white;text-decoration:none;border-radius:8px;font-weight:600;">
                        Aceptar Invitación
                    </a>
                    <p style="color:#6b7280;font-size:0.85rem">Este enlace expira en 7 días. Si no esperabas esta invitación, ignora este correo.</p>
                </div>
            `,
            text: `Invitación para administrar ${club.nombre}. Accede aquí: ${link}`,
        });

        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...inv, link }),
        };
    } catch (error) {
        return authError(error.message);
    }
};

// GET /clubes/{clubId}/invitaciones
export const listar = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) return apiKeyValidation.response;

        const userId = getUserIdFromToken(event);
        const { clubId } = event.pathParameters;

        const club = await verifyClubOwnership(clubId, userId);
        if (!club) {
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'No tienes permisos' }),
            };
        }

        const { data, error } = await supabase
            .from('el_dep_invitaciones')
            .select('id, email, estado, created_at, expires_at, accepted_at, token')
            .eq('club_id', clubId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const now = new Date();
        const result = data.map(inv => ({
            ...inv,
            estado: inv.estado === 'pendiente' && new Date(inv.expires_at) < now ? 'vencida' : inv.estado,
            link: `${process.env.FRONTEND_URL}/invitacion/${inv.token}`,
        }));

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result),
        };
    } catch (error) {
        return authError(error.message);
    }
};

// DELETE /clubes/{clubId}/invitaciones/{id}
export const revocar = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) return apiKeyValidation.response;

        const userId = getUserIdFromToken(event);
        const { clubId, id } = event.pathParameters;

        const club = await verifyClubOwnership(clubId, userId);
        if (!club) {
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'No tienes permisos' }),
            };
        }

        // Obtener usuario_id antes de eliminar para revocar acceso
        const { data: inv } = await supabase
            .from('el_dep_invitaciones')
            .select('usuario_id')
            .eq('id', id)
            .eq('club_id', clubId)
            .single();

        const { error } = await supabase
            .from('el_dep_invitaciones')
            .delete()
            .eq('id', id)
            .eq('club_id', clubId);

        if (error) throw error;

        // Si el invitado ya había aceptado, revocar su acceso al club
        if (inv?.usuario_id) {
            await supabase
                .from('el_dep_club_usuarios')
                .delete()
                .eq('club_id', clubId)
                .eq('usuario_id', inv.usuario_id);
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Invitación eliminada' }),
        };
    } catch (error) {
        return authError(error.message);
    }
};

// GET /invitaciones/{token}  — público, sin auth
export const verificar = async (event) => {
    try {
        const { token } = event.pathParameters;

        const { data: inv, error } = await supabase
            .from('el_dep_invitaciones')
            .select('id, email, estado, expires_at, el_dep_clubes(nombre, deporte)')
            .eq('token', token)
            .single();

        if (error || !inv) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Invitación no encontrada' }),
            };
        }

        const vencida = new Date(inv.expires_at) < new Date();

        if (inv.estado !== 'pendiente' || vencida) {
            return {
                statusCode: 410,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: vencida ? 'La invitación ha vencido' : `Invitación ${inv.estado}`,
                    estado: vencida ? 'vencida' : inv.estado,
                }),
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: inv.email,
                club: inv.el_dep_clubes,
                expires_at: inv.expires_at,
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: error.message }),
        };
    }
};

// POST /invitaciones/{token}/aceptar  — requiere auth
export const aceptar = async (event) => {
    try {
        const apiKeyValidation = validateApiKey(event);
        if (!apiKeyValidation.valid) return apiKeyValidation.response;

        const userId = getUserIdFromToken(event);
        const { token } = event.pathParameters;

        const { data: inv, error: invError } = await supabase
            .from('el_dep_invitaciones')
            .select('*')
            .eq('token', token)
            .single();

        if (invError || !inv) {
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Invitación no encontrada' }),
            };
        }

        if (inv.estado !== 'pendiente' || new Date(inv.expires_at) < new Date()) {
            return {
                statusCode: 410,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'La invitación no está disponible' }),
            };
        }

        const { error: updateError } = await supabase
            .from('el_dep_invitaciones')
            .update({ estado: 'aceptada', usuario_id: userId, accepted_at: new Date().toISOString() })
            .eq('id', inv.id);

        if (updateError) throw updateError;

        const { error: usuarioError } = await supabase
            .from('el_dep_club_usuarios')
            .upsert([{ club_id: inv.club_id, usuario_id: userId, rol: 'admin' }], {
                onConflict: 'club_id,usuario_id',
            });

        if (usuarioError) throw usuarioError;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Invitación aceptada', club_id: inv.club_id }),
        };
    } catch (error) {
        return authError(error.message);
    }
};
