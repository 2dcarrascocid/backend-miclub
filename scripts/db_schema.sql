-- Script de Modelo de Datos para Sistema de Gestión de Club Deportivo
-- Incluye tablas de Autenticación y Negocio

-- ==========================================
-- 1. Tablas de Autenticación y Usuarios (Base)
-- ==========================================

-- 1.1 Identidades (Usuarios del sistema)
CREATE TABLE IF NOT EXISTS el_dep_identidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL, -- 'local', 'google', etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2 Credenciales Locales
CREATE TABLE IF NOT EXISTS el_dep_credenciales_locales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES el_dep_identidades(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    ultimo_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id)
);

-- 1.3 Proveedores de Autenticación (OAuth)
CREATE TABLE IF NOT EXISTS el_dep_proveedor_autenticacion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES el_dep_identidades(id) ON DELETE CASCADE,
    proveedor TEXT NOT NULL,
    proveedor_user_id TEXT NOT NULL,
    email TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(proveedor, proveedor_user_id)
);

-- 1.4 Roles
CREATE TABLE IF NOT EXISTS el_dep_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT
);

-- 1.5 Usuario - Roles
CREATE TABLE IF NOT EXISTS el_dep_usuario_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES el_dep_identidades(id) ON DELETE CASCADE,
    rol_id UUID NOT NULL REFERENCES el_dep_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, rol_id)
);

-- 1.6 Sesiones
CREATE TABLE IF NOT EXISTS el_dep_sesiones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES el_dep_identidades(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    dispositivo TEXT,
    valido BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expire_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 1.7 Token Blacklist
CREATE TABLE IF NOT EXISTS el_dep_token_blacklist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_hash TEXT NOT NULL,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. Tablas de Negocio (Club Deportivo)
-- ==========================================

-- 2.1 Tabla de Clubes
CREATE TABLE IF NOT EXISTS el_dep_clubes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    admin_id UUID NOT NULL REFERENCES el_dep_identidades(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 Tabla de Jugadores (Registro de jugadores por club)
CREATE TABLE IF NOT EXISTS el_dep_jugadores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES el_dep_clubes(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES el_dep_identidades(id) ON DELETE SET NULL, -- Enlace opcional a usuario del sistema
    nombre_completo TEXT NOT NULL,
    rut TEXT,
    email TEXT,
    telefono TEXT,
    fecha_nacimiento DATE,
    es_socio BOOLEAN DEFAULT FALSE,
    es_jugador BOOLEAN DEFAULT FALSE,
    folio INTEGER,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3 Tabla de Movimientos Financieros (Libro de Ingresos y Egresos)
CREATE TABLE IF NOT EXISTS el_dep_movimientos_financieros (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES el_dep_clubes(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
    categoria TEXT, -- Ej: 'cuota', 'arriendo', 'pago_servicios'
    monto NUMERIC(12, 2) NOT NULL,
    descripcion TEXT,
    fecha_movimiento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registrado_por UUID REFERENCES el_dep_identidades(id) ON DELETE SET NULL,
    origen_id UUID,
    origen_tipo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.4 Tabla de Cierres Mensuales
CREATE TABLE IF NOT EXISTS el_dep_cierres_mensuales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES el_dep_clubes(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    anio INTEGER NOT NULL,
    total_ingresos NUMERIC(12, 2) DEFAULT 0,
    total_egresos NUMERIC(12, 2) DEFAULT 0,
    saldo_final NUMERIC(12, 2) DEFAULT 0,
    observaciones TEXT,
    cerrado_por UUID REFERENCES el_dep_identidades(id) ON DELETE SET NULL,
    fecha_cierre TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(club_id, mes, anio)
);

-- 2.5 Tabla de Eventos
CREATE TABLE IF NOT EXISTS el_dep_club_eventos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES el_dep_clubes(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    tipo_evento TEXT,
    fecha_evento TIMESTAMP WITH TIME ZONE,
    fecha_limite_pago TIMESTAMP WITH TIME ZONE,
    costo_unitario NUMERIC(12, 2) DEFAULT 0,
    estado TEXT DEFAULT 'borrador', -- 'borrador', 'publicado', 'cerrado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.6 Tabla de Jugadores en Eventos (Inscripciones)
CREATE TABLE IF NOT EXISTS el_dep_club_evento_jugadores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evento_id UUID NOT NULL REFERENCES el_dep_club_eventos(id) ON DELETE CASCADE,
    jugador_id UUID NOT NULL REFERENCES el_dep_jugadores(id) ON DELETE CASCADE,
    numero_jugador TEXT,
    estado_pago TEXT DEFAULT 'pendiente', -- 'pendiente', 'pagado'
    monto NUMERIC(12, 2) DEFAULT 0,
    fecha_limite_pago TIMESTAMP WITH TIME ZONE,
    fecha_pago TIMESTAMP WITH TIME ZONE,
    estado_cumplimiento TEXT, -- 'a_tiempo', 'atrasado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(evento_id, jugador_id)
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_clubes_admin ON el_dep_clubes(admin_id);
CREATE INDEX IF NOT EXISTS idx_jugadores_club ON el_dep_jugadores(club_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_club_fecha ON el_dep_movimientos_financieros(club_id, fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_cierres_club_periodo ON el_dep_cierres_mensuales(club_id, anio, mes);
CREATE INDEX IF NOT EXISTS idx_eventos_club ON el_dep_club_eventos(club_id);
CREATE INDEX IF NOT EXISTS idx_evento_jugadores_evento ON el_dep_club_evento_jugadores(evento_id);

-- Insertar Roles Básicos si no existen
INSERT INTO el_dep_roles (nombre, descripcion) VALUES 
('admin', 'Administrador del Sistema'),
('jugador', 'Usuario Jugador Básico')
ON CONFLICT (nombre) DO NOTHING;

