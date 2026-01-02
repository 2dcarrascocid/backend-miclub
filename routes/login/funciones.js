// login/funciones.js
import { randomBytes, pbkdf2, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import * as crud from "./crud_login.js";
import { OAuth2Client } from "google-auth-library";

/* ---------------------------------------------------------
   CONFIGURACIÓN GENERAL
--------------------------------------------------------- */

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access-secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh-secret";

const ACCESS_TOKEN_EXP = "15m"; // recomendado
const REFRESH_TOKEN_BYTES = 64; // length de refresh token

/* ---------------------------------------------------------
   ✨ NORMALIZACIÓN
--------------------------------------------------------- */

export function normalizeEmail(email) {
  if (!email) return null;
  return email.trim().toLowerCase();
}

/* ---------------------------------------------------------
   🔐 HASH DE PASSWORD (PBKDF2 / crypto)
--------------------------------------------------------- */

export function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");

    pbkdf2(password, salt, 310000, 32, "sha256", (err, hashed) => {
      if (err) return reject(err);

      resolve({
        hash: hashed.toString("hex"),
        salt,
      });
    });
  });
}

export function verifyPassword(password, hash, salt) {
  return new Promise((resolve, reject) => {
    if (!salt || !hash) {
      return reject(new Error("Salt o hash inválido"));
    }

    pbkdf2(password, salt, 310000, 32, "sha256", (err, hashed) => {
      if (err) return reject(err);

      resolve(hashed.toString("hex") === hash);
    });
  });
}

/* ---------------------------------------------------------
   🔐 GENERACIÓN DE TOKENS (JWT)
--------------------------------------------------------- */

export async function generateAccessToken(userId) {

  const rol = await crud.getUserRoles(userId)

  const payload = {
    sub: userId,
    roles: rol
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXP });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new Error("Token inválido o expirado");
  }
}

export async function verifyGoogleToken(idToken) {
  const expectedAudience = process.env.GOOGLE_CLIENT_ID;
  try {
    if (!idToken) throw new Error("Token de Google no enviado");

    const client = new OAuth2Client(expectedAudience);

    const ticket = await client.verifyIdToken({
      idToken,
      audience: expectedAudience,
    });

    const payload = ticket.getPayload();

    return payload; // email, name, picture, sub, etc.

  } catch (error) {
    console.error("❌ Error verificando token de Google:", error);
    throw new Error("Token de Google inválido");
  }

}

/* ---------------------------------------------------------
   🔃 GENERACIÓN DE REFRESH TOKEN (secure)
--------------------------------------------------------- */

export function generateRefreshToken() {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

/* ---------------------------------------------------------
   🔏 HASH DE REFRESH TOKEN (para almacenar en BD)
--------------------------------------------------------- */

export function hashRefreshToken(refreshToken) {
  return createHash("sha256").update(refreshToken).digest("hex");
}

/* ---------------------------------------------------------
   🧹 SANITIZACIÓN DE USUARIO
--------------------------------------------------------- */

export function sanitizeUserData(user) {
  if (!user) return null;

  const clean = { ...user };
  delete clean.password_hash;
  delete clean.password_salt;
  delete clean.refresh_token_hash;

  return clean;
}

/* ---------------------------------------------------------
   🔐 VALIDADOR DE ROLES Y PERMISOS
--------------------------------------------------------- */

export function hasRole(userRoles, requiredRole) {
  return userRoles.includes(requiredRole);
}

export function hasPermission(userPermissions, requiredPermission) {
  return userPermissions.includes(requiredPermission);
}

/* ---------------------------------------------------------
   📦 RESPUESTA ESTÁNDAR DE LOGIN
--------------------------------------------------------- */

export function buildAuthResponse({
  user,
  roles,
  plan,
  permisos,
  clubes,
  accessToken,
  refreshToken,
  sessionId,
}) {
  return {
    usuario: sanitizeUserData(user),
    roles,
    plan,
    permisos,
    clubes,
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
      session_id: sessionId,
    },
  };
}

/* ---------------------------------------------------------
   🧰 CONSTRUCCIÓN DE DATOS DE SESIÓN
--------------------------------------------------------- */

export function buildSessionMetadata(event) {
  return {
    userAgent: event.headers["User-Agent"] || "unknown",
    ip: event.headers["X-Forwarded-For"] || "127.0.0.1",
    device: event.headers["X-Device"] || "unknown",
  };
}

/* ---------------------------------------------------------
   🧱 GENERAR EXPIRACIÓN PARA REFRESH TOKEN
--------------------------------------------------------- */

export function refreshTokenExpireAt(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/* ---------------------------------------------------------
   📧 VERIFICACIÓN DE EMAIL
--------------------------------------------------------- */

export function generateVerificationToken() {
  return randomBytes(32).toString("hex");
}

export function verificationTokenExpireAt(hours = 24) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}
