import * as crud from './crud_login.js';
import * as funciones from './funciones.js';
import { validateApiKey } from '../../utils/apiKeyMiddleware.js';
import { sendEmail } from '../notifications/emailService.js';
import { getTemplate, NOTIFICATION_TYPES } from '../notifications/templates/index.js';

export const register = async (event) => {
  try {
    // Validar API Key
    const apiKeyValidation = validateApiKey(event);
    if (!apiKeyValidation.valid) {
      return apiKeyValidation.response;
    }

    const body = JSON.parse(event.body);
    const { email, password, nombre, ...metadata } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Email y password son obligatorios' }),
      };
    }

    // 1. Generar token de verificación
    const verificationToken = funciones.generateVerificationToken();
    const verificationExpires = funciones.verificationTokenExpireAt();

    // 2. Registrar usuario local
    // Nota: registerLocalUser ya normaliza el email y hashea el password
    const user = await crud.registerLocalUser({
      email,
      password,
      metadata: { nombre, ...metadata },
      verification_token: verificationToken,
      verification_token_expires_at: verificationExpires
    });

    // 3. Enviar correo
    const template = getTemplate(NOTIFICATION_TYPES.AUTH_REGISTER, {
      nombre,
      token: verificationToken
    });

    // Enviar sin esperar (fire and forget) o esperar si es crítico. 
    // Para registro suele ser mejor esperar para confirmar que salió el mail, o manejarlo en cola.
    // Aquí esperamos para reportar error si falla el envío, aunque el usuario ya se creó.
    const emailResult = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    if (!emailResult.success) {
      console.warn("Error enviando email de verificación:", emailResult.error);
      // Opcional: Podríamos retornar error o advertencia, pero el usuario ya se creó.
      // Retornamos éxito pero con mensaje
    }

    // 4. Respuesta (Sin iniciar sesión automáticamente)
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Usuario registrado exitosamente. Por favor revisa tu correo para activar tu cuenta.',
        usuario: funciones.sanitizeUserData(user),
        emailSent: emailResult.success
      }),
    };

    /* FLUJO ANTERIOR (Auto-login) - Comentado para flujo de verificación
    // 2. Generar tokens y sesión
    const accessToken = await funciones.generateAccessToken(user.id);
    // ...
    */
    
  } catch (error) {
    console.error("Register Error:", error);
    return {
      statusCode: error.message === 'Email ya registrado' ? 409 : 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

export const login = async (event) => {
  try {
    // Validar API Key
    const apiKeyValidation = validateApiKey(event);
    if (!apiKeyValidation.valid) {
      return apiKeyValidation.response;
    }

    const body = JSON.parse(event.body);
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Email y password son obligatorios' }),
      };
    }

    // 1. Validar credenciales
    const user = await crud.loginLocal({ email, password });

    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Credenciales inválidas' }),
      };
    }

    // 2. Validar Email Verificado
    if (!user.email_verified) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Tu cuenta no ha sido verificada. Por favor revisa tu correo.' }),
      };
    }

    // 3. Generar tokens y sesión
    const accessToken = await funciones.generateAccessToken(user.id);
    const refreshToken = funciones.generateRefreshToken();
    const refreshTokenHash = funciones.hashRefreshToken(refreshToken);
    const expireAt = funciones.refreshTokenExpireAt();

    const sessionMeta = funciones.buildSessionMetadata(event);

    const session = await crud.createSession({
      usuario_id: user.id,
      refresh_token_hash: refreshTokenHash,
      user_agent: sessionMeta.userAgent,
      ip_address: sessionMeta.ip,
      dispositivo: sessionMeta.device,
      valido: true,
      created_at: new Date().toISOString(),
      expire_at: expireAt
    });

// 3. Obtener roles y permisos
    const roles = await crud.getUserRoles(user.id);

    const permisos = await crud.getUserPermissions(user.id);  

    const clubes = await crud.getUserClubs(user.id);

    const plan = await crud.getUserPlan(user.id);

    // 4. Construir respuesta
    const response = funciones.buildAuthResponse({
      user,
      roles ,
      plan,
      permisos,
      clubes,
      accessToken,
      refreshToken,
      sessionId: session.id
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error("Login Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

export const verifyAccount = async (event) => {
  try {
    const { token } = event.queryStringParameters || {};

    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Token de verificación requerido' }),
      };
    }

    await crud.verifyUserEmail(token);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Cuenta verificada exitosamente. Ahora puedes iniciar sesión.' }),
    };

  } catch (error) {
    console.error("Verification Error:", error);
    return {
      statusCode: 400, // Bad Request para tokens inválidos/expirados
      body: JSON.stringify({ message: error.message }),
    };
  }
};

export const logout = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { sessionId } = body;

    if (sessionId) {
      await crud.invalidateSession(sessionId);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Sesión cerrada exitosamente' }),
    };
  } catch (error) {
    console.error("Logout Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error cerrando sesión' }),
    };
  }
};

export const getProfile = async (event) => {
  try {
    // 1. Validar Token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ message: 'No autorizado' }) };
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = funciones.verifyAccessToken(token);
    const userId = decoded.sub;

    // 2. Obtener datos
    const user = await crud.findUserById(userId);
    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Usuario no encontrado' }) };
    }

    const roles = await crud.getUserRoles(userId);
    const permisos = await crud.getUserPermissions(userId);
    const clubes = await crud.getUserClubs(userId);

    // 3. Respuesta (similar a login pero sin nuevos tokens)
    return {
      statusCode: 200,
      body: JSON.stringify({
        usuario: funciones.sanitizeUserData(user),
        roles,
        permisos,
        clubes
      }),
    };
  } catch (error) {
    console.error("GetProfile Error:", error);
    return {
      statusCode: error.message === 'Token inválido o expirado' ? 401 : 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

export const updateProfile = async (event) => {
  try {
    // 1. Validar Token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, body: JSON.stringify({ message: 'No autorizado' }) };
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = funciones.verifyAccessToken(token);
    const userId = decoded.sub;

    // 2. Parsear body
    const body = JSON.parse(event.body);
    const { nombre, apellido, path_foto } = body;

    // 3. Obtener usuario actual para preservar otros metadatos
    const currentUser = await crud.findUserById(userId);
    if (!currentUser) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Usuario no encontrado' }) };
    }

    const currentMetadata = currentUser.metadata || {};
    
    // Actualizar metadata
    const newMetadata = {
      ...currentMetadata,
      ...(nombre !== undefined && { nombre }),
      ...(apellido !== undefined && { apellido }),
      ...(path_foto !== undefined && { path_foto })
    };

    // 4. Actualizar en DB
    const updatedUser = await crud.updateUserIdentity(userId, {
      metadata: newMetadata
    });

    // 5. Retornar usuario actualizado
    return {
      statusCode: 200,
      body: JSON.stringify({
        usuario: funciones.sanitizeUserData(updatedUser)
      }),
    };

  } catch (error) {
    console.error("UpdateProfile Error:", error);
    return {
      statusCode: error.message === 'Token inválido o expirado' ? 401 : 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
