-- Script para agregar tablas y columnas faltantes para el módulo de Eventos

-- 1. Crear tabla de Eventos
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

-- 2. Crear tabla de Jugadores en Eventos (Inscripciones)
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

-- 3. Actualizar tabla de Movimientos Financieros para soportar trazabilidad
ALTER TABLE el_dep_movimientos_financieros 
ADD COLUMN IF NOT EXISTS origen_id UUID,
ADD COLUMN IF NOT EXISTS origen_tipo TEXT; -- 'evento_pago_atrasado', 'evento_cierre', etc.

-- Índices recomendados
CREATE INDEX IF NOT EXISTS idx_eventos_club ON el_dep_club_eventos(club_id);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON el_dep_club_eventos(fecha_evento);
CREATE INDEX IF NOT EXISTS idx_evento_jugadores_evento ON el_dep_club_evento_jugadores(evento_id);
CREATE INDEX IF NOT EXISTS idx_evento_jugadores_jugador ON el_dep_club_evento_jugadores(jugador_id);
