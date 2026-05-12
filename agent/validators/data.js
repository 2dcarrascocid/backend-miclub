export function validateMultiTenantFilter(query, expectedClubId) {
  if (!expectedClubId) {
    return { valid: false, error: 'club_id filter is required for multi-tenant queries' };
  }
  return { valid: true };
}

export function validateSupabaseResult({ data, error }, options = {}) {
  const { required = true, entityName = 'Record' } = options;

  if (error) {
    return {
      valid: false,
      error: `Database error: ${error.message}`,
      code: error.code,
    };
  }

  if (required && (data === null || data === undefined)) {
    return { valid: false, error: `${entityName} not found`, code: 'NOT_FOUND' };
  }

  return { valid: true, data };
}

export function validateRequiredFields(obj, fields) {
  const missing = fields.filter((f) => {
    const val = obj?.[f];
    return val === undefined || val === null || val === '';
  });

  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
  }
  return { valid: true };
}

export function validatePaymentStateTransition(currentStatus, nextStatus) {
  const ALLOWED = {
    PENDING: ['SUCCESS', 'REJECTED'],
    SUCCESS: ['REFUNDED'],
    REJECTED: [],
    REFUNDED: [],
  };

  const allowed = ALLOWED[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      error: `Invalid state transition: ${currentStatus} → ${nextStatus}`,
    };
  }
  return { valid: true };
}

export function validateClubOwnership(club, userId) {
  if (!club) return { valid: false, error: 'Club not found' };
  if (club.admin_id !== userId) {
    return { valid: false, error: 'User is not the club admin' };
  }
  return { valid: true };
}
