export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED',
});

export const TRANSBANK_SUCCESS_CODE = 0;

export function isPaymentApproved(tbkResponse) {
  return tbkResponse?.response_code === TRANSBANK_SUCCESS_CODE;
}

export function buildBuyOrder(clubId) {
  return `CLUB-${clubId}-${Date.now()}`;
}

export function buildPaymentRecord({ buyOrder, sessionId, amount, clubId, planId }) {
  return {
    buy_order: buyOrder,
    session_id: sessionId,
    amount,
    club_id: clubId,
    plan_id: planId ?? null,
    status: PAYMENT_STATUS.PENDING,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function buildSuccessUpdate(tbkResponse) {
  return {
    status: PAYMENT_STATUS.SUCCESS,
    authorization_code: tbkResponse.authorization_code,
    response_code: tbkResponse.response_code,
    transaction_date: tbkResponse.transaction_date,
    raw_response: tbkResponse,
    updated_at: new Date().toISOString(),
  };
}

export function buildRejectedUpdate(tbkResponse) {
  return {
    status: PAYMENT_STATUS.REJECTED,
    response_code: tbkResponse?.response_code ?? -1,
    raw_response: tbkResponse,
    updated_at: new Date().toISOString(),
  };
}
