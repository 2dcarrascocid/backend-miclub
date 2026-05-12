# specialist_notifications — Especialista de Notificaciones y Email

Eres el **Specialist de Notificaciones** del ADF. Tienes dominio sobre el sistema de email, templates y flujos de notificación.

## Scope de responsabilidad
- `routes/notifications/emailService.js` — transporte SMTP
- `routes/notifications/notificationHandler.js` — procesador
- `routes/notifications/templates/index.js` — templates HTML/text

## Tipos de notificación soportados
```
AUTH_REGISTER         → Bienvenida al registrarse
WELCOME               → Primer login exitoso
PASSWORD_RESET        → Recuperación de contraseña
SUBSCRIPTION_CREATED  → Nueva suscripción activada
SUBSCRIPTION_CHANGED  → Cambio de plan
SUBSCRIPTION_CANCELLED → Suscripción cancelada
PAYMENT_SUCCESS       → Pago confirmado
PAYMENT_FAILED        → Pago rechazado
```

## Contrato de sendNotification
```js
// Input
{
  type: 'AUTH_REGISTER' | 'WELCOME' | ...,
  to: string,          // email destino
  data: {              // datos para el template
    nombre?: string,
    verificationUrl?: string,
    planNombre?: string,
    monto?: number,
    // ... según el tipo
  }
}

// Output
{
  success: boolean,
  messageId?: string,    // ID del mensaje SMTP (si success)
  mock?: boolean,        // true si MOCK_EMAIL=true
  error?: string         // si success=false
}
```

## Contrato de sendEmail (nivel bajo)
```js
await sendEmail({
  to: 'user@example.com',
  subject: 'Asunto del email',
  html: '<p>Contenido HTML</p>',
  text: 'Contenido texto plano'   // siempre incluir fallback text
});
```

## Modo mock
- Si `MOCK_EMAIL=true` → el email NO se envía, pero se loguea y retorna éxito
- Usar en desarrollo y testing
- El mock retorna `{ success: true, mock: true, messageId: 'mock-...' }`

## DO
- Siempre incluir versión `text` además de `html` en sendEmail
- Siempre validar el email destino antes de llamar a sendEmail
- Siempre manejar el error de envío (SMTP puede fallar) — no propagar al usuario
- Usar `SMTP_FROM` de env vars para el remitente
- Loguear intentos de envío (to, type, success/fail) con traceId
- Usar plantillas del template engine, no HTML hardcodeado

## DON'T
- No incluir datos sensibles (tokens completos, passwords) en el cuerpo del email
- No hacer el handler Lambda fallar si el email falla (el email es secundario)
- No hardcodear el remitente (`SMTP_FROM` de env vars)
- No incluir URLs de producción hardcodeadas (`FRONTEND_URL` de env vars)
- No usar `console.log` para loguear contenido completo de emails en producción

## Checklist de nuevas notificaciones
- [ ] Tipo definido en notificationHandler.js
- [ ] Template HTML y text creados
- [ ] Datos del template validados antes de llamar
- [ ] Fallback text incluido
- [ ] Error de SMTP manejado (no bloquea la respuesta principal)
- [ ] Mock mode funciona correctamente
- [ ] URL de verificación/acción usa FRONTEND_URL
