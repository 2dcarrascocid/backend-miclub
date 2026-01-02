import * as crud from './crud_membresia.js';
import { sendNotification } from '../notifications/notificationHandler.js';
import { NOTIFICATION_TYPES } from '../notifications/templates/index.js';

// Helper response
const response = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
});

// Helper error
const errorResponse = (error, statusCode = 500) => {
  console.error("Membresia Error:", error);
  return response(statusCode, { message: error.message || 'Error interno' });
};

// ==================== HANDLERS ====================

export const listarPlanes = async (event) => {
  try {
    const planes = await crud.getPlanes();
    return response(200, planes);
  } catch (error) {
    return errorResponse(error);
  }
};

export const obtenerPlan = async (event) => {
  try {
    const { codigo } = event.pathParameters;
    const plan = await crud.getPlanByCodigo(codigo);
    if (!plan) return response(404, { message: 'Plan no encontrado' });
    return response(200, plan);
  } catch (error) {
    return errorResponse(error);
  }
};

export const obtenerSuscripcionClub = async (event) => {
  try {
    const { club_id } = event.pathParameters;
    const sub = await crud.getSuscripcionByClub(club_id);
    // Si no tiene suscripción, devolvemos null o un 404 manejado. 
    // Para el frontend es mejor un 200 con null o un objeto vacío controlado, pero el frontend espera 404 según la lógica original.
    // Sin embargo, si es 404 el frontend Promise.allSettled lo marca como rejected si la librería axios lanza error.
    if (!sub) return response(404, { message: 'Club sin suscripción registrada' });
    return response(200, sub);
  } catch (error) {
    return errorResponse(error);
  }
};

export const historialSuscripcion = async (event) => {
  try {
    const { club_id } = event.pathParameters;
    const { limit, offset } = event.queryStringParameters || {};
    const historial = await crud.getHistorialSuscripcion(club_id, limit, offset);
    return response(200, historial);
  } catch (error) {
    return errorResponse(error);
  }
};

export const solicitarCambioPlan = async (event) => {
  try {
    const { club_id } = event.pathParameters;
    const body = JSON.parse(event.body);
    const { plan_codigo, billing_period } = body;
    
    // TODO: Obtener usuario del token (auth middleware assumed passed in context or header parsing needed if strict)
    const userId = body.user_id; // Temporary: Frontend should send this or extract from token

    if (!plan_codigo || !billing_period) {
        return response(400, { message: 'Faltan datos requeridos (plan_codigo, billing_period)' });
    }

    const nuevaSub = await crud.createOrUpdateSuscripcion(club_id, plan_codigo, billing_period, userId);
    
    // Notificar Admin
    const adminEmail = await crud.getClubAdminEmail(club_id);
    if (adminEmail) {
        await sendNotification({
            type: NOTIFICATION_TYPES.SUBSCRIPTION_CHANGE_REQUEST,
            recipient: adminEmail,
            data: {
                nombre: 'Admin', // O nombre real si lo tuviéramos fácil
                plan_nombre: nuevaSub.plan_nombre || plan_codigo,
                token: 'N/A' // No necesario para este template
            }
        });
    }

    return response(200, { message: 'Solicitud de cambio creada. Pendiente de pago/activación.', suscripcion: nuevaSub });
  } catch (error) {
    return errorResponse(error);
  }
};

export const activarSuscripcion = async (event) => {
  try {
    const { club_id } = event.pathParameters;
    const body = JSON.parse(event.body);
    const { fecha_fin, motivo, user_id } = body;

    const sub = await crud.activarSuscripcion(club_id, fecha_fin, motivo, user_id);

    // Notificar al club/admin
    const adminEmail = await crud.getClubAdminEmail(club_id);
    if (adminEmail) {
       await sendNotification({ 
           type: NOTIFICATION_TYPES.SUBSCRIPTION_ACTIVE, 
           recipient: adminEmail, 
           data: { 
               nombre: 'Admin',
               plan_nombre: sub.plan_nombre,
               fecha_fin: fecha_fin
           } 
       });
    }

    return response(200, { message: 'Suscripción activada exitosamente', suscripcion: sub });
  } catch (error) {
    return errorResponse(error);
  }
};

export const cancelarSuscripcion = async (event) => {
  try {
    const { club_id } = event.pathParameters;
    const body = JSON.parse(event.body);
    const { user_id } = body;

    const sub = await crud.cancelarSuscripcion(club_id, user_id);

    // Notificar
    const adminEmail = await crud.getClubAdminEmail(club_id);
    if (adminEmail) {
        await sendNotification({
            type: NOTIFICATION_TYPES.SUBSCRIPTION_CANCELLED,
            recipient: adminEmail,
            data: { nombre: 'Admin' }
        });
    }

    return response(200, { message: 'Suscripción cancelada', suscripcion: sub });
  } catch (error) {
    return errorResponse(error);
  }
};

export const obtenerFeatures = async (event) => {
  try {
    const { club_id } = event.pathParameters;
    const features = await crud.getClubFeatures(club_id);
    return response(200, features);
  } catch (error) {
    return errorResponse(error);
  }
};

// ==================== CRON JOBS ====================

export const jobMarcarVencidas = async (event) => {
    try {
        const result = await crud.marcarSuscripcionesVencidas();
        return response(200, { message: `Proceso completado. ${result.length} suscripciones marcadas como vencidas.` });
    } catch (error) {
        return errorResponse(error);
    }
};

export const jobNotificarVencimiento = async (event) => {
    try {
        const dias = event.queryStringParameters?.dias || 7;
        const porVencer = await crud.getSuscripcionesPorVencer(dias);
        
        let enviados = 0;
        
        for (const sub of porVencer) {
             const adminEmail = sub.club?.admin?.email;
             if (adminEmail) {
                 await sendNotification({
                     type: NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
                     recipient: adminEmail,
                     data: {
                         nombre: sub.club.nombre,
                         fecha_fin: sub.fecha_fin
                     }
                 });
                 enviados++;
             }
        }
        
        return response(200, { message: `Encontradas ${porVencer.length} suscripciones por vencer.`, enviados });
    } catch (error) {
        return errorResponse(error);
    }
};

// ==================== PAGOS SKELETON ====================

export const checkout = async (event) => {
    return response(200, { message: 'Checkout iniciado (Skeleton)', url_pago: 'https://webpay.cl/...' });
};

export const webhookPagos = async (event) => {
    return response(200, { message: 'Webhook recibido' });
};
