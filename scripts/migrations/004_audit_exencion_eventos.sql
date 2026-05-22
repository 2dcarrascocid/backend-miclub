-- Migración 004: Auditoría y exención en eventos
-- Agrega creado_por a eventos, motivo_exencion y registrado_por a evento_jugadores

-- Quién creó el evento
ALTER TABLE el_dep_club_eventos
ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES el_dep_identidades(id) ON DELETE SET NULL;

-- Exención de pago: motivo y quién registró al jugador en el evento
ALTER TABLE el_dep_club_evento_jugadores
ADD COLUMN IF NOT EXISTS motivo_exencion TEXT,
ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES el_dep_identidades(id) ON DELETE SET NULL;
