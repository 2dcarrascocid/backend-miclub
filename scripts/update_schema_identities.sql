-- Script para agregar campos de verificación de correo a la tabla de identidades

ALTER TABLE el_dep_identidades 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Índice para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_identidades_verification_token ON el_dep_identidades(verification_token);
