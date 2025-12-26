export const NOTIFICATION_TYPES = {
  AUTH_REGISTER: 'AUTH_REGISTER', // Verificación de cuenta
  WELCOME: 'WELCOME',             // Bienvenida post-verificación (opcional)
  PASSWORD_RESET: 'PASSWORD_RESET',
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

    default:
      throw new Error(`Template type ${type} not found`);
  }
};
