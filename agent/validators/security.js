const SENSITIVE_FIELDS = new Set([
  'password',
  'password_hash',
  'salt',
  'refresh_token_hash',
  'verification_token',
  'api_key',
  'secret',
]);

export function validateNoSensitiveFields(obj, path = '') {
  const errors = [];
  if (!obj || typeof obj !== 'object') return errors;

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      errors.push(`Sensitive field exposed: ${fullPath}`);
    }
    if (value && typeof value === 'object') {
      errors.push(...validateNoSensitiveFields(value, fullPath));
    }
  }
  return errors;
}

export function validateApiKeyPresent(event) {
  const key = event?.headers?.['x-api-key'] || event?.headers?.['X-Api-Key'];
  if (!key) return { valid: false, error: 'Missing x-api-key header' };
  return { valid: true };
}

export function validateBearerToken(event) {
  const auth = event?.headers?.Authorization || event?.headers?.authorization;
  if (!auth) return { valid: false, error: 'Missing Authorization header' };
  if (!auth.startsWith('Bearer ')) return { valid: false, error: 'Authorization must be Bearer token' };
  const token = auth.slice(7);
  if (!token) return { valid: false, error: 'Empty Bearer token' };
  return { valid: true, token };
}

export function validatePaymentAmount(requestAmount, dbAmount) {
  if (requestAmount !== dbAmount) {
    return { valid: false, error: `Amount mismatch: request=${requestAmount} db=${dbAmount}` };
  }
  return { valid: true };
}

export function validateEmailFormat(email) {
  const normalized = email?.toLowerCase()?.trim();
  if (!normalized) return { valid: false, error: 'Email is required' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true, normalized };
}
