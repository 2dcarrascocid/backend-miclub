export const NOTIFICATION_TYPES = {
  AUTH_REGISTER: 'AUTH_REGISTER', // Verificación de cuenta
  WELCOME: 'WELCOME',             // Bienvenida post-verificación (opcional)
  PASSWORD_RESET: 'PASSWORD_RESET',
  SUBSCRIPTION_CHANGE_REQUEST: 'SUBSCRIPTION_CHANGE_REQUEST',
  SUBSCRIPTION_ACTIVE: 'SUBSCRIPTION_ACTIVE',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_EXPIRING: 'SUBSCRIPTION_EXPIRING'
};

export const getTemplate = (type, data) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  switch (type) {
    case NOTIFICATION_TYPES.AUTH_REGISTER:
      return {
        subject: 'Verifica tu cuenta en MiClub',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h1>¡Bienvenido a MiClub, ${data.nombre || 'Usuario'}!</h1>
            <p>Gracias por registrarte. Para activar tu cuenta, por favor verifica tu correo electrónico.</p>
            <p>
              <a href="${frontendUrl}/verify-account?token=${data.token}" 
                 style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Verificar mi cuenta
              </a>
            </p>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p>${frontendUrl}/verify-account?token=${data.token}</p>
            <p>Este enlace expirará en 24 horas.</p>
          </div>
        `,
        text: `Bienvenido a MiClub! Por favor verifica tu cuenta usando este enlace: ${frontendUrl}/verify-account?token=${data.token}`
      };

    case NOTIFICATION_TYPES.WELCOME:
        return {
          subject: '¡Tu cuenta está activa!',
          html: `<h1>¡Hola ${data.nombre}!</h1><p>Tu cuenta ha sido verificada exitosamente.</p>`,
          text: `Hola ${data.nombre}, tu cuenta ha sido verificada exitosamente.`
        };

    case NOTIFICATION_TYPES.SUBSCRIPTION_CHANGE_REQUEST:
        return {
            subject: 'Solicitud de Cambio de Plan Recibida',
            html: `
                <h1>Hola ${data.nombre || 'Admin'},</h1>
                <p>Hemos recibido la solicitud para cambiar al plan <strong>${data.plan_nombre}</strong>.</p>
                <p>Tu suscripción está en estado: <strong>Pendiente de Pago</strong>.</p>
                <p>Por favor realiza el pago correspondiente para activar los beneficios.</p>
            `,
            text: `Solicitud recibida para plan ${data.plan_nombre}. Estado: Pendiente de Pago.`
        };

    case NOTIFICATION_TYPES.SUBSCRIPTION_ACTIVE:
        return {
            subject: '¡Tu Plan está Activo!',
            html: `
                <h1>¡Felicidades!</h1>
                <p>Tu suscripción al plan <strong>${data.plan_nombre}</strong> ha sido activada.</p>
                <p>Ahora puedes disfrutar de todos los beneficios hasta el ${data.fecha_fin || '...'}.</p>
            `,
            text: `Tu suscripción al plan ${data.plan_nombre} ha sido activada.`
        };

    case NOTIFICATION_TYPES.SUBSCRIPTION_CANCELLED:
        return {
            subject: 'Confirmación de Cancelación',
            html: `
                <p>Tu suscripción ha sido cancelada según tu solicitud.</p>
                <p>Lamentamos verte partir.</p>
            `,
            text: `Tu suscripción ha sido cancelada.`
        };
        
    case NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING:
        return {
            subject: 'Tu suscripción está por vencer',
            html: `
                <p>Tu plan vence el ${data.fecha_fin}.</p>
                <p>Renueva pronto para no perder tus beneficios.</p>
            `,
            text: `Tu plan vence el ${data.fecha_fin}.`
        };

    default:
      throw new Error(`Template type ${type} not found`);
  }
};
