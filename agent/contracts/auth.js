export const TOKEN_EXPIRY = Object.freeze({
  ACCESS: '15m',
  REFRESH_DAYS: 30,
  VERIFICATION_HOURS: 24,
});

export const SESSION_FIELDS = Object.freeze([
  'id',
  'usuario_id',
  'refresh_token_hash',
  'user_agent',
  'ip_address',
  'dispositivo',
  'valido',
  'expire_at',
  'created_at',
]);

export const SAFE_USER_FIELDS = Object.freeze([
  'id',
  'email',
  'nombre',
  'apellido',
  'foto_url',
  'email_verified',
  'provider',
  'created_at',
]);

export const SENSITIVE_USER_FIELDS = Object.freeze([
  'password_hash',
  'salt',
  'verification_token',
  'verification_token_expires_at',
]);

export function buildAuthResponse({ user, accessToken, refreshToken }) {
  return {
    user: pickSafeFields(user),
    accessToken,
    refreshToken,
    expiresIn: 900,
  };
}

function pickSafeFields(user) {
  if (!user) return null;
  return Object.fromEntries(
    SAFE_USER_FIELDS
      .filter((f) => f in user)
      .map((f) => [f, user[f]])
  );
}

export function buildSessionRecord({ userId, refreshTokenHash, event }) {
  const ua = event?.headers?.['User-Agent'] || event?.headers?.['user-agent'] || 'unknown';
  const ip = event?.requestContext?.identity?.sourceIp || event?.headers?.['x-forwarded-for'] || 'unknown';

  return {
    usuario_id: userId,
    refresh_token_hash: refreshTokenHash,
    user_agent: ua,
    ip_address: ip,
    dispositivo: detectDevice(ua),
    valido: true,
    expire_at: new Date(Date.now() + TOKEN_EXPIRY.REFRESH_DAYS * 86400 * 1000).toISOString(),
  };
}

function detectDevice(ua = '') {
  if (/mobile|android|iphone/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}
