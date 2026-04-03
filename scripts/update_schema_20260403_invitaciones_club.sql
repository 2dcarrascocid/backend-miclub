-- ============================================================
-- Migration: update_schema_20260403_invitaciones_club.sql
-- Description: Agrega sistema de invitaciones de usuarios al club.
--              Permite que el admin invite colaboradores por email
--              con un link único y temporal (7 días).
-- Author: ADF Database Specialist
-- Date: 2026-04-03
-- Backward compatible: YES
-- ============================================================

-- ── UP: Aplicar migración ────────────────────────────────────

-- 3.x Invitaciones de usuarios al club
-- Almacena cada invitación enviada por el admin.
-- El token UUID único es el que viaja en el link de invitación.
CREATE TABLE IF NOT EXISTS el_dep_invitaciones (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id     UUID        NOT NULL REFERENCES el_dep_clubes(id) ON DELETE CASCADE,
    email       TEXT        NOT NULL,
    token       UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    estado      TEXT        NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente', 'aceptada', 'revocada')),
    creado_por  UUID        NOT NULL REFERENCES el_dep_identidades(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    accepted_at TIMESTAMPTZ,
    usuario_id  UUID        REFERENCES el_dep_identidades(id) ON DELETE SET NULL
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_invitaciones_club_id
    ON el_dep_invitaciones(club_id);

CREATE INDEX IF NOT EXISTS idx_invitaciones_token
    ON el_dep_invitaciones(token);

CREATE INDEX IF NOT EXISTS idx_invitaciones_email_club
    ON el_dep_invitaciones(email, club_id);


-- 3.y Usuarios por club (relación many-to-many)
-- Registra qué usuarios tienen acceso a administrar el club,
-- creado al aceptar una invitación.
CREATE TABLE IF NOT EXISTS el_dep_club_usuarios (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id     UUID        NOT NULL REFERENCES el_dep_clubes(id) ON DELETE CASCADE,
    usuario_id  UUID        NOT NULL REFERENCES el_dep_identidades(id) ON DELETE CASCADE,
    rol         TEXT        NOT NULL DEFAULT 'admin'
                            CHECK (rol IN ('admin', 'viewer')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(club_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_club_usuarios_club_id
    ON el_dep_club_usuarios(club_id);

CREATE INDEX IF NOT EXISTS idx_club_usuarios_usuario_id
    ON el_dep_club_usuarios(usuario_id);


-- ── DOWN: Revertir migración ──────────────────────────────────
-- DROP TABLE IF EXISTS el_dep_club_usuarios;
-- DROP TABLE IF EXISTS el_dep_invitaciones;
