import * as crud from './crud_login.js';
import * as funciones from './funciones.js';
import { validateApiKey } from '../../utils/apiKeyMiddleware.js';

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

    // 1. Registrar usuario local
    // Nota: registerLocalUser ya normaliza el email y hashea el password
    const user = await crud.registerLocalUser({
      email,
      password,
      metadata: { nombre, ...metadata }
    });

    // 2. Generar tokens y sesión
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

    // 3. Obtener roles y permisos (por defecto jugador al registrarse)
    const roles = await crud.getUserRoles(user.id);
    const permisos = await crud.getUserPermissions(user.id);
    const clubes = await crud.getUserClubs(user.id);

    // 4. Construir respuesta
    const response = funciones.buildAuthResponse({
      user,
      roles,
      permisos,
      clubes,
      accessToken,
      refreshToken,
      sessionId: session.id
    });

    return {
      statusCode: 201,
      body: JSON.stringify(response),
    };

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

    // 2. Generar tokens y sesión
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

    // 4. Construir respuesta
    const response = funciones.buildAuthResponse({
      user,
      roles,
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
