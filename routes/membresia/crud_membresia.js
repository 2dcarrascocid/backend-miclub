import { supabase } from '../../services/db.js';

// ==================== PLANES ====================

export async function getPlanes() {
  const { data, error } = await supabase
    .from('el_dep_planes')
    .select(`
      *,
      limites:el_dep_plan_limites(*)
    `)
    .eq('activo', true)
    .order('precio_mensual', { ascending: true });

  if (error) throw new Error("Error obteniendo planes: " + error.message);
  return data;
}

export async function getPlanByCodigo(codigo) {
  const { data, error } = await supabase
    .from('el_dep_planes')
    .select(`
      *,
      limites:el_dep_plan_limites(*)
    `)
    .eq('codigo', codigo)
    .single();

  if (error) throw new Error("Error obteniendo plan: " + error.message);
  return data;
}

// ==================== SUSCRIPCIONES ====================

export async function getSuscripcionByClub(clubId) {
  const { data, error } = await supabase
    .from('el_dep_club_suscripciones')
    .select(`
      *,
      plan:el_dep_planes(*, limites:el_dep_plan_limites(*))
    `)
    .eq('club_id', clubId)
    // Asumimos que solo hay una suscripción activa/pendiente por club, o queremos la más reciente
    // El índice único condicional ayuda a garantizar unicidad en estados activos
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("Error obteniendo suscripción: " + error.message);
  return data;
}

export async function getHistorialSuscripcion(clubId, limit = 50, offset = 0) {
  // Primero obtenemos la suscripción actual (o suscripciones asociadas al club)
  // Pero el historial está linkeado a suscripciones, no directamente al club en el modelo dado.
  // Sin embargo, podemos hacer join.
  
  const { data, error } = await supabase
    .from('el_dep_club_suscripcion_historial')
    .select(`
      *,
      suscripcion:el_dep_club_suscripciones!inner(club_id),
      plan_anterior:plan_anterior_id(nombre),
      plan_nuevo:plan_nuevo_id(nombre),
      cambiado_por:cambiado_por(email)
    `)
    .eq('suscripcion.club_id', clubId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error("Error obteniendo historial: " + error.message);
  return data;
}

export async function createOrUpdateSuscripcion(clubId, planCodigo, billingPeriod, userId) {
    // 1. Buscar plan
    const plan = await getPlanByCodigo(planCodigo);
    if (!plan) throw new Error("Plan no encontrado");

    // 2. Buscar suscripción actual
    const currentSub = await getSuscripcionByClub(clubId);

    let resultSub;
    let action = 'creacion';
    let oldPlanId = null;
    let oldStatus = null;

    if (currentSub) {
        // Actualizar existente
        oldPlanId = currentSub.plan_id;
        oldStatus = currentSub.estado;
        action = plan.id === oldPlanId ? 'renovacion' : 'cambio_plan';

        const { data, error } = await supabase
            .from('el_dep_club_suscripciones')
            .update({
                plan_id: plan.id,
                billing_period: billingPeriod,
                estado: 'pendiente_pago', // Se solicita cambio, queda pendiente confirmación/pago
                updated_at: new Date()
            })
            .eq('id', currentSub.id)
            .select()
            .single();
        
        if (error) throw new Error("Error actualizando suscripción: " + error.message);
        resultSub = data;
    } else {
        // Crear nueva
        const { data, error } = await supabase
            .from('el_dep_club_suscripciones')
            .insert({
                club_id: clubId,
                plan_id: plan.id,
                billing_period: billingPeriod,
                estado: 'pendiente_pago',
                fecha_inicio: new Date(),
                creado_por: userId
            })
            .select()
            .single();

        if (error) throw new Error("Error creando suscripción: " + error.message);
        resultSub = data;
    }

    // 3. Registrar Historial
    await supabase.from('el_dep_club_suscripcion_historial').insert({
        club_suscripcion_id: resultSub.id,
        estado_anterior: oldStatus,
        estado_nuevo: 'pendiente_pago',
        plan_anterior_id: oldPlanId,
        plan_nuevo_id: plan.id,
        // accion: action, // Ajustado a modelo
        motivo: `Solicitud de cambio a ${plan.nombre} (${billingPeriod})`,
        cambiado_por: userId
    });
    
    // Return plan info as well for notification
    resultSub.plan_nombre = plan.nombre;

    return resultSub;
}

export async function activarSuscripcion(clubId, fechaFin, motivo, userId) {
    const currentSub = await getSuscripcionByClub(clubId);
    if (!currentSub) throw new Error("No hay suscripción para activar");

    const oldStatus = currentSub.estado;

    const { data, error } = await supabase
        .from('el_dep_club_suscripciones')
        .update({
            estado: 'activa',
            fecha_fin: fechaFin,
            updated_at: new Date()
        })
        .eq('id', currentSub.id)
        .select()
        .single();

    if (error) throw new Error("Error activando suscripción: " + error.message);

    // Historial
    await supabase.from('el_dep_club_suscripcion_historial').insert({
        club_suscripcion_id: currentSub.id,
        estado_anterior: oldStatus,
        estado_nuevo: 'activa',
        plan_anterior_id: currentSub.plan_id,
        plan_nuevo_id: currentSub.plan_id,
        motivo: motivo || 'Activación manual',
        cambiado_por: userId
    });
    
    data.plan_nombre = currentSub.plan.nombre;

    return data;
}

export async function cancelarSuscripcion(clubId, userId) {
    const currentSub = await getSuscripcionByClub(clubId);
    if (!currentSub) throw new Error("No hay suscripción para cancelar");

    const oldStatus = currentSub.estado;

    const { data, error } = await supabase
        .from('el_dep_club_suscripciones')
        .update({
            estado: 'cancelada',
            updated_at: new Date()
        })
        .eq('id', currentSub.id)
        .select()
        .single();

    if (error) throw new Error("Error cancelando suscripción: " + error.message);

    // Historial
    await supabase.from('el_dep_club_suscripcion_historial').insert({
        club_suscripcion_id: currentSub.id,
        estado_anterior: oldStatus,
        estado_nuevo: 'cancelada',
        plan_anterior_id: currentSub.plan_id,
        plan_nuevo_id: currentSub.plan_id,
        motivo: 'Cancelación por usuario',
        cambiado_por: userId
    });

    return data;
}

// ==================== FEATURES Y CONTADORES ====================

export async function getClubFeatures(clubId) {
    const sub = await getSuscripcionByClub(clubId);
    
    // Default features for NO subscription (or fallback to free limits hardcoded if needed)
    // Assuming 'barrio_libre' defaults if no sub found or logic requires it.
    // Here we return what we find or nulls.
    
    if (!sub || sub.estado !== 'activa') {
        // Fallback to Free Plan features if needed, or return restricted
        // Let's try to fetch 'barrio_libre' limits to return as default
        const freePlan = await getPlanByCodigo('barrio_libre');
        if (freePlan && freePlan.limites) {
            return { ...freePlan.limites, plan_nombre: freePlan.nombre, estado_suscripcion: 'sin_suscripcion_activa' };
        }
        return { max_jugadores: 0, permite_eventos_pago: false };
    }

    return {
        ...sub.plan.limites,
        plan_nombre: sub.plan.nombre,
        estado_suscripcion: sub.estado,
        fecha_fin: sub.fecha_fin
    };
}

export async function countJugadores(clubId) {
    const { count, error } = await supabase
        .from('el_dep_jugadores')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .eq('activo', true);

    if (error) throw new Error("Error contando jugadores: " + error.message);
    return count;
}

// ==================== CRON / ADMIN ====================

export async function getSuscripcionesPorVencer(dias = 7) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);

    const { data, error } = await supabase
        .from('el_dep_club_suscripciones')
        .select('*, club:el_dep_clubes(nombre, admin:el_dep_identidades(email))')
        .eq('estado', 'activa')
        .lt('fecha_fin', fechaLimite.toISOString())
        .gt('fecha_fin', new Date().toISOString()); // Que no estén ya vencidas

    if (error) throw new Error("Error buscando suscripciones por vencer: " + error.message);
    return data;
}

export async function marcarSuscripcionesVencidas() {
    const hoy = new Date().toISOString();

    // 1. Identificar vencidas
    const { data: vencidas, error: findError } = await supabase
        .from('el_dep_club_suscripciones')
        .select('id, club_id, plan_id')
        .eq('estado', 'activa')
        .lt('fecha_fin', hoy);

    if (findError) throw new Error("Error buscando vencidas: " + findError.message);
    if (!vencidas || vencidas.length === 0) return [];

    const ids = vencidas.map(s => s.id);

    // 2. Actualizar estado
    const { data: updated, error: updateError } = await supabase
        .from('el_dep_club_suscripciones')
        .update({ estado: 'vencida', updated_at: new Date() })
        .in('id', ids)
        .select();

    if (updateError) throw new Error("Error actualizando vencidas: " + updateError.message);

    // 3. Historial (idealmente en batch, aquí loop simple por brevedad)
    for (const sub of vencidas) {
        await supabase.from('el_dep_club_suscripcion_historial').insert({
            club_suscripcion_id: sub.id,
            estado_anterior: 'activa',
            estado_nuevo: 'vencida',
            plan_anterior_id: sub.plan_id,
            plan_nuevo_id: sub.plan_id,
            motivo: 'Vencimiento automático de fecha',
        });
    }

    return updated;
}

export async function getClubAdminEmail(clubId) {
    const { data, error } = await supabase
        .from('el_dep_clubes')
        .select('admin_id, admin:el_dep_identidades(email)')
        .eq('id', clubId)
        .single();
    
    if (error || !data) return null;
    return data.admin?.email;
}
