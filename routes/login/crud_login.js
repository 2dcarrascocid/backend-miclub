// login/crud.js
import { supabase } from './../../services/db.js';
import * as funciones from './funciones.js';

/* -----------------------------------------
   🔵 CRUD: IDENTIDADES (el_dep_identidades)
----------------------------------------- */

export async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from("el_dep_identidades")
    .select("*")
    .eq("email", email)
    .single();

  if (error) return null;
  return data;
}

export async function findUserById(id) {
  const { data, error } = await supabase
    .from("el_dep_identidades")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function createUserIdentity({ email, provider, metadata, email_verified, verification_token, verification_token_expires_at }) {
  const { data, error } = await supabase
    .from("el_dep_identidades")
    .insert([{ 
      email, 
      provider, 
      metadata,
      email_verified: email_verified || false,
      verification_token,
      verification_token_expires_at
    }])
    .select()
    .single();

  if (error) throw new Error("Error creando identidad: " + error.message);
  return data;
}

export async function verifyUserEmail(token) {
  // 1. Buscar usuario por token
  const { data: user, error } = await supabase
    .from("el_dep_identidades")
    .select("*")
    .eq("verification_token", token)
    .single();

  if (error || !user) throw new Error("Token inválido o usuario no encontrado");

  // 2. Verificar expiración
  if (new Date(user.verification_token_expires_at) < new Date()) {
    throw new Error("El token ha expirado");
  }

  // 3. Actualizar usuario (activar)
  const { data: updated, error: updateError } = await supabase
    .from("el_dep_identidades")
    .update({ 
      email_verified: true, 
      verification_token: null, 
      verification_token_expires_at: null 
    })
    .eq("id", user.id)
    .select()
    .single();

  if (updateError) throw new Error("Error activando usuario");

  return updated;
}

export async function updateUserIdentity(id, dataToUpdate) {
  const { data, error } = await supabase
    .from("el_dep_identidades")
    .update(dataToUpdate)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error("Error actualizando usuario: " + error.message);
  return data;
}

/* -----------------------------------------
   🔐 CREDENCIALES LOCALES (password hash)
----------------------------------------- */

export async function setLocalCredentials(userId, passwordHash, salt) {
  const { data, error } = await supabase
    .from("el_dep_credenciales_locales")
    .upsert({
      usuario_id: userId,
      password_hash: passwordHash,
      password_salt: salt,
      ultimo_cambio: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error("Error guardando credenciales: " + error.message);
  return data;
}

export async function getLocalCredentials(userId) {
  const { data, error } = await supabase
    .from("el_dep_credenciales_locales")
    .select("*")
    .eq("usuario_id", userId)
    .single();

  if (error) return null;
  return data;
}

/* -----------------------------------------
   🔵 PROVEEDORES SOCIALES (OAuth)
----------------------------------------- */

export async function findOrCreateSocialIdentity({
  proveedor,
  proveedor_user_id,
  email,
  metadata,
}) {
  // Buscar si ya existe
  let { data, error } = await supabase
    .from("el_dep_proveedor_autenticacion")
    .select("*")
    .eq("proveedor", proveedor)
    .eq("proveedor_user_id", proveedor_user_id)
    .single();

  if (!error && data) return data;

  // Crear identidad nueva (solo en tabla proveedor, requiere linkeo posterior si no se pasa usuario_id)
  // Nota: Esta función es de bajo nivel. La lógica de negocio está en el handler.
  const { data: newRow, error: insertError } = await supabase
    .from("el_dep_proveedor_autenticacion")
    .insert([{ proveedor, proveedor_user_id, email, metadata }])
    .select()
    .single();

  if (insertError) throw new Error("Error creando identidad social");
  return newRow;
}

/* -----------------------------------------
   🟣 ROLES & PERMISOS
----------------------------------------- */

export async function getUserRoles(userId) {
  const { data, error } = await supabase
    .from("el_dep_usuario_roles")
    .select("rol_id, el_dep_roles(nombre)")
    .eq("usuario_id", userId);

  if (error) return []; // Si no tiene roles o error, retornar array vacío
  return data.map((r) => r.el_dep_roles.nombre);
}

export async function getUserPermissions(userId) {
  console.log("userId", userId);
  // 1. Obtener roles del usuario
  const { data: userRoles, error: userRolesError } = await supabase
    .from("el_dep_usuario_roles")
    .select("*")
    .eq("usuario_id", userId);

  if (userRolesError) throw new Error("Error obteniendo roles: " + userRolesError.message);
  if (!userRoles || userRoles.length === 0) return [];

  const roleIds = userRoles.map((r) => r.rol_id);

  // 2. Obtener detalles de roles
  const { data: roles, error: rolesError } = await supabase
    .from("el_dep_roles")
    .select("*")
    .in("id", roleIds);

  if (rolesError) throw new Error("Error obteniendo detalles de roles: " + rolesError.message);

  // 3. Obtener planes asociados (asumiendo que el rol tiene plan_id)
  const planIds = roles
    .map((r) => r.id_plan)
    .filter((id) => id); // Filtrar nulos

  if (planIds.length === 0) return [];

  // 4. Obtener detalles de planes (opcional, pero solicitado en el flujo)
  const { error: planesError } = await supabase
    .from("el_dep_planes")
    .select("*")
    .in("id", planIds);

  if (planesError) throw new Error("Error obteniendo planes: " + planesError.message);

  // 5. Obtener menú y permisos
  const { data: menuItems, error: menuError } = await supabase
    .from("el_dep_plan_menu")
    .select(`
      puede_editar,
      menu:el_dep_menu (
        nombre,
        ruta,
        icono
      )
    `)
    .in("plan_id", planIds);

  if (menuError) throw new Error("Error obteniendo permisos de menú: " + menuError.message);
console.log(`menuItems->`,menuItems)
  // Mapear respuesta
  return menuItems.map((item) => ({
    nombre: item.menu?.nombre,
    ruta: item.menu?.ruta,
    icono: item.menu?.icono,
    puede_editar: item.puede_editar,
  }));
}


export async function assignRoleToUser(userId, roleName) {
  // 1. Buscar ID del rol
  const { data: role, error: roleError } = await supabase
    .from("el_dep_roles")
    .select("id")
    .eq("nombre", roleName)
    .single();

  if (roleError || !role) throw new Error(`Rol '${roleName}' no encontrado`);

  // 2. Asignar
  const { data, error } = await supabase
    .from("el_dep_usuario_roles")
    .insert([{ usuario_id: userId, rol_id: role.id }])
    .select()
    .single();

  if (error) {
    // Ignorar error de duplicado
    if (error.code === '23505') return null;
    throw new Error("Error asignando rol al usuario: " + error.message);
  }

  return data;
}

/* -----------------------------------------
   🔐 SESIONES (refresh token)
----------------------------------------- */

export async function createSession(sessionData) {
  const { data, error } = await supabase
    .from("el_dep_sesiones")
    .insert([sessionData])
    .select()
    .single();

  if (error) throw new Error("Error creando sesión: " + error.message);
  return data;
}

export async function invalidateSession(sessionId) {
  const { data, error } = await supabase
    .from("el_dep_sesiones")
    .update({ valido: false })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw new Error("Error invalidando sesión: " + error.message);
  return data;
}

/* -----------------------------------------
   🟢 OPERACIONES COMBINADAS
----------------------------------------- */

export async function loginLocal({ email, password }) {
  const normalizedEmail = funciones.normalizeEmail(email);

  const user = await findUserByEmail(normalizedEmail);
  if (!user) throw new Error("Usuario no encontrado");

  const credentials = await getLocalCredentials(user.id);
  if (!credentials) throw new Error("Usuario sin credenciales locales");

  const validPass = await funciones.verifyPassword(
    password,
    credentials.password_hash,
    credentials.password_salt
  );

  if (!validPass) throw new Error("Credenciales inválidas");

  return user;
}

export async function registerLocalUser({ email, password, metadata, verification_token, verification_token_expires_at }) {
  const normalizedEmail = funciones.normalizeEmail(email);

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) throw new Error("Email ya registrado");

  const user = await createUserIdentity({
    email: normalizedEmail,
    provider: "local",
    metadata,
    email_verified: false,
    verification_token,
    verification_token_expires_at
  });

  const { hash, salt } = await funciones.hashPassword(password);

  await setLocalCredentials(user.id, hash, salt);

  await assignRoleToUser(user.id, "administrador_basic");

  return user;
}

export async function getUserClubs(userId) {
  const { data, error } = await supabase
    .from("el_dep_clubes")
    .select("*")
    .eq("admin_id", userId);

  if (error) return [];
  return data;
}
