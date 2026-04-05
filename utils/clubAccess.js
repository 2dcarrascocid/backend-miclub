import { supabase } from '../services/db.js';

/**
 * Verifica si el usuario tiene acceso al club:
 * 1. Es el administrador propietario (admin_id)
 * 2. Fue invitado y aceptó (el_dep_club_usuarios)
 */
export const verifyClubAccess = async (clubId, userId) => {
    // 1. Propietario del club
    const { data: club } = await supabase
        .from('el_dep_clubes')
        .select('id')
        .eq('id', clubId)
        .eq('admin_id', userId)
        .single();
    if (club) return true;

    // 2. Usuario invitado con acceso
    const { data: acceso } = await supabase
        .from('el_dep_club_usuarios')
        .select('id')
        .eq('club_id', clubId)
        .eq('usuario_id', userId)
        .single();

    return !!acceso;
};
