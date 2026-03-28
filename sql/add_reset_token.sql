-- Migración: Agregar campos de reset de contraseña a el_dep_identidades
-- Ejecutar en Supabase SQL Editor

ALTER TABLE el_dep_identidades
  ADD COLUMN IF NOT EXISTS reset_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

-- Índice para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_identidades_reset_token
  ON el_dep_identidades (reset_token)
  WHERE reset_token IS NOT NULL;
