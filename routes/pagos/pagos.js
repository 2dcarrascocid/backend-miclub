import { WebpayService } from '../../services/transbankService.js';
import * as crud from './crud_pagos.js';

// Helpers de respuesta estándar
const response = (statusCode, body) => ({
    statusCode,
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body),
});

const errorResponse = (error, statusCode = 500) => {
    console.error('Payment Error:', error);
    return response(statusCode, { message: error.message || 'Error interno en pagos' });
};

/**
 * 1. INICIAR PAGO (Create)
 * Genera token y URL para redirigir al frontend a Webpay
 */
export const create = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const { amount, clubId, userId, metadata } = body; // metadata puede incluir items, plan_id, etc.

        // Validaciones básicas
        if (!amount || amount <= 0) return response(400, { message: 'Monto inválido' });
        
        // Generar identificadores únicos
        const buyOrder = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const sessionId = `SES-${Date.now()}-${userId || 'guest'}`;
        
        // URL de retorno (Backend o Frontend intermedio)
        // Opción A: Return a Backend -> Backend procesa -> Redirige a Frontend
        // Opción B: Return a Frontend -> Frontend llama a API commit
        // Recomendación Transbank: Return a página de "Procesando..." que hace POST automático al backend
        // Aquí usaremos la URL del backend que ejecutará el commit y luego redirigirá.
        const returnUrl = process.env.WEBPAY_RETURN_URL || `https://${event.headers.Host}/dev/api/pagos/webpay-plus/return`;

        // 1. Guardar Intención de Pago en DB (PENDING)
        await crud.createPaymentRecord({
            buyOrder,
            sessionId,
            amount,
            clubId,
            userId,
            metadata
        });

        // 2. Llamar a Transbank
        const txResponse = await WebpayService.create(buyOrder, sessionId, amount, returnUrl);

        // 3. Actualizar token en DB
        await crud.updatePaymentToken(buyOrder, txResponse.token);

        return response(200, {
            token: txResponse.token,
            url: txResponse.url, // URL de Webpay
            buy_order: buyOrder
        });

    } catch (error) {
        return errorResponse(error);
    }
};

/**
 * 2. RETORNO DE WEBPAY (Return / Commit)
 * Transbank hace POST a esta URL con el token.
 * Aquí confirmamos la transacción.
 */
export const commit = async (event) => {
    try {
        let token;
        
        // 1. Intentar obtener token de Query String (GET o POST con params en URL)
        // Webpay Plus Redirect: A veces llega por GET, a veces POST.
        if (event.queryStringParameters && event.queryStringParameters.token_ws) {
            token = event.queryStringParameters.token_ws;
        } 
        // 2. Si es cancelación por usuario (TBK_TOKEN)
        else if (event.queryStringParameters && event.queryStringParameters.TBK_TOKEN) {
             return await handleAbortedPayment(event.queryStringParameters.TBK_TOKEN, 'ABORTED_BY_USER');
        }
        // 3. Si viene por Body (POST form-urlencoded)
        else if (event.httpMethod === 'POST' && event.body) {
             const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
             
             if (contentType.includes('application/json')) {
                 const body = JSON.parse(event.body);
                 token = body.token_ws;
             } else {
                 // x-www-form-urlencoded
                 const params = new URLSearchParams(event.body);
                 token = params.get('token_ws');
                 
                 if (!token && params.get('TBK_TOKEN')) {
                     return await handleAbortedPayment(params.get('TBK_TOKEN'), 'ABORTED_BY_USER');
                 }
             }
        }

        if (!token) {
            console.error("Token no recibido en commit");
            return redirectFrontend(false, 'no-token');
        }

        console.log(`[Webpay Commit] Procesando token: ${token}`);

        // 1. Confirmar con Transbank (Commit)
        const commitResponse = await WebpayService.commit(token);
        console.log("[Webpay Commit] Respuesta:", commitResponse);

        // 2. Verificar respuesta
        // response_code === 0 significa Aprobado
        if (commitResponse.response_code === 0) {
            // APROBADO
            await crud.updatePaymentStatus(token, 'AUTHORIZED', commitResponse);
            
            // TODO: Activar suscripción si es necesario
            // await activateSubscription(token, commitResponse);

            return redirectFrontend(true, token);
        } else {
            // RECHAZADO
            await crud.updatePaymentStatus(token, 'REJECTED', commitResponse);
            return redirectFrontend(false, token);
        }

    } catch (error) {
        console.error("Commit Error:", error);
        
        // Si el token ya fue confirmado, Webpay lanza error. 
        // Intentamos redirigir a éxito si ya está pagado en nuestra DB.
        // O a error si falló algo más.
        return redirectFrontend(false, 'error_process');
    }
};

/**
 * Helper para redirigir al Frontend Final
 */
function redirectFrontend(success, token) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const status = success ? 'success' : 'error';
    const redirectUrl = `${baseUrl}/pagos/resultado?token=${token}&status=${status}`;

    return {
        statusCode: 302,
        headers: {
            Location: redirectUrl
        }
    };
}

async function handleAbortedPayment(token, reason) {
    await crud.failPayment(token, 'CANCELLED', { reason });
    return redirectFrontend(false, token);
}

/**
 * 3. ESTADO DE TRANSACCIÓN (Status)
 * Para consultar desde el frontend o panel admin
 */
export const status = async (event) => {
    try {
        const { token } = event.pathParameters;
        if (!token) return response(400, { message: 'Token requerido' });

        // Consultar DB local primero
        const localPayment = await crud.getPaymentByToken(token);
        if (!localPayment) return response(404, { message: 'Pago no encontrado' });

        // Opcional: Re-consultar a Transbank para sincronizar si hay dudas
        // const tbkStatus = await WebpayService.status(token);

        return response(200, localPayment);

    } catch (error) {
        return errorResponse(error);
    }
};

/**
 * 4. REEMBOLSO (Refund)
 * Solo administradores
 */
export const refund = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const { token, amount } = body;

        if (!token || !amount) return response(400, { message: 'Token y monto requeridos' });

        // Validar pago local
        const payment = await crud.getPaymentByToken(token);
        if (!payment || payment.status !== 'AUTHORIZED') {
            return response(400, { message: 'Pago no elegible para reembolso' });
        }

        // Ejecutar reembolso en TBK
        const refundResponse = await WebpayService.refund(token, amount);

        // Actualizar estado (Si es total o parcial)
        const type = refundResponse.type === 'NULLIFIED' ? 'NULLIFIED' : 'REVERSED'; // Simplificado
        // Podríamos guardar un registro en una tabla 'refunds' separada.
        
        // Por ahora actualizamos metadata o status si es total
        if (refundResponse.balance === 0) {
             await crud.updatePaymentStatus(token, 'REFUNDED', { ...payment.raw_response, refund: refundResponse });
        }

        return response(200, refundResponse);

    } catch (error) {
        return errorResponse(error);
    }
};
