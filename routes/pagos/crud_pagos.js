import { supabase } from '../../services/db.js';

/**
 * Crea un registro de pago inicial (PENDING)
 */
export async function createPaymentRecord({
    buyOrder,
    sessionId,
    amount,
    clubId,
    userId,
    metadata
}) {
    const { data, error } = await supabase
        .from('el_dep_pagos_webpay')
        .insert([{
            buy_order: buyOrder,
            session_id: sessionId,
            amount: amount,
            club_id: clubId,
            usuario_id: userId,
            status: 'PENDING',
            metadata: metadata
        }])
        .select()
        .single();

    if (error) throw new Error("Error creando registro de pago: " + error.message);
    return data;
}

/**
 * Actualiza el token entregado por Webpay tras create
 */
export async function updatePaymentToken(buyOrder, token) {
    const { data, error } = await supabase
        .from('el_dep_pagos_webpay')
        .update({ token })
        .eq('buy_order', buyOrder)
        .select()
        .single();

    if (error) throw new Error("Error actualizando token de pago: " + error.message);
    return data;
}

/**
 * Busca un pago por token (usado en return_url)
 */
export async function getPaymentByToken(token) {
    const { data, error } = await supabase
        .from('el_dep_pagos_webpay')
        .select('*')
        .eq('token', token)
        .single();

    if (error) return null;
    return data;
}

/**
 * Actualiza el estado y detalles tras el commit
 */
export async function updatePaymentStatus(token, status, tbkResponse) {
    const { data, error } = await supabase
        .from('el_dep_pagos_webpay')
        .update({
            status: status,
            authorization_code: tbkResponse.authorization_code,
            payment_type_code: tbkResponse.payment_type_code,
            response_code: tbkResponse.response_code,
            installments_number: tbkResponse.installments_number,
            transaction_date: tbkResponse.transaction_date,
            raw_response: tbkResponse,
            updated_at: new Date().toISOString()
        })
        .eq('token', token)
        .select()
        .single();

    if (error) throw new Error("Error actualizando estado de pago: " + error.message);
    return data;
}

/**
 * Marca como rechazado/cancelado
 */
export async function failPayment(token, status = 'REJECTED', rawResponse = {}) {
    const { data, error } = await supabase
        .from('el_dep_pagos_webpay')
        .update({
            status: status,
            raw_response: rawResponse,
            updated_at: new Date().toISOString()
        })
        .eq('token', token)
        .select()
        .single();
    
    return data;
}

/**
 * Registra un pago en la tabla generica el_dep_payments
 */
export async function registerPayment({
    order_id,
    amount,
    status,
    document_type = null,
    document_folio = null,
    document_pdf = null
}) {
    const { data, error } = await supabase
        .from('el_dep_payments')
        .insert([{
            order_id,
            amount,
            status,
            document_type,
            document_folio,
            document_pdf
        }])
        .select()
        .single();

    if (error) throw new Error("Error registrando pago en el_dep_payments: " + error.message);
    return data;
}

/**
 * Actualiza el estado en la tabla generica el_dep_payments
 */
export async function updateGenericPaymentStatus(orderId, status) {
    const { data, error } = await supabase
        .from('el_dep_payments')
        .update({
            status: status,
            // Aquí se podrían mapear más campos si vinieran en el response de TBK y la tabla los soportara
        })
        .eq('order_id', orderId)
        .select()
        .single();
    
    if (error) throw new Error("Error actualizando el_dep_payments: " + error.message);
    return data;
}
