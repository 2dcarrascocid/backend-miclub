-- ==========================================
-- 3. Tablas de Membresía y Suscripciones (Definición Final)
-- ==========================================

-- Tipos ENUM
CREATE TYPE el_dep_plan_tier AS ENUM ('free', 'medio', 'pro'); 
CREATE TYPE el_dep_suscripcion_estado AS ENUM ('activa', 'pendiente_pago', 'vencida', 'cancelada'); 
CREATE TYPE el_dep_billing_period AS ENUM ('mensual', 'anual'); 

-- 3.1 Catálogo de Planes
CREATE TABLE IF NOT EXISTS el_dep_planes ( 
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(), 
   codigo text NOT NULL UNIQUE,                 -- 'barrio_libre', 'barrio_ordenado', 'barrio_pro' 
   nombre text NOT NULL,                        -- Nombre visible 
   tier el_dep_plan_tier NOT NULL,              -- free|medio|pro 
   descripcion text, 
   precio_mensual numeric NOT NULL DEFAULT 0, 
   precio_anual numeric NOT NULL DEFAULT 0, 
   activo boolean NOT NULL DEFAULT true, 
   created_at timestamptz NOT NULL DEFAULT now(), 
   updated_at timestamptz NOT NULL DEFAULT now() 
); 

CREATE INDEX IF NOT EXISTS el_dep_planes_activo_idx ON el_dep_planes(activo); 

-- 3.2 Límites del Plan
CREATE TABLE IF NOT EXISTS el_dep_plan_limites ( 
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(), 
   plan_id uuid NOT NULL REFERENCES el_dep_planes(id) ON DELETE CASCADE, 
 
   -- límites típicos para clubes de barrio 
   max_jugadores integer,              -- NULL = ilimitado 
   max_admins integer,                 -- NULL = ilimitado 
   permite_eventos_pago boolean NOT NULL DEFAULT false, 
   permite_reportes boolean NOT NULL DEFAULT false, 
   permite_finanzas boolean NOT NULL DEFAULT false, 
   permite_notificaciones_email boolean NOT NULL DEFAULT false, 
 
   created_at timestamptz NOT NULL DEFAULT now(), 
 
   CONSTRAINT el_dep_plan_limites_plan_id_unique UNIQUE (plan_id) 
); 

-- 3.3 Suscripciones de Clubes
CREATE TABLE IF NOT EXISTS el_dep_club_suscripciones ( 
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(), 
   club_id uuid NOT NULL REFERENCES el_dep_clubes(id) ON DELETE CASCADE, 
   plan_id uuid NOT NULL REFERENCES el_dep_planes(id), 
 
   estado el_dep_suscripcion_estado NOT NULL DEFAULT 'activa', 
   billing_period el_dep_billing_period NOT NULL DEFAULT 'mensual', 
 
   fecha_inicio date NOT NULL DEFAULT CURRENT_DATE, 
   fecha_fin date,                              -- si es mensual/anual, aquí queda el vencimiento 
   auto_renovar boolean NOT NULL DEFAULT false, -- más adelante si implementas cobro automático 
 
   creado_por uuid REFERENCES el_dep_identidades(id), 
   created_at timestamptz NOT NULL DEFAULT now(), 
   updated_at timestamptz NOT NULL DEFAULT now() 
); 

CREATE UNIQUE INDEX IF NOT EXISTS el_dep_club_suscripciones_activa_unique 
ON el_dep_club_suscripciones (club_id) 
WHERE estado IN ('activa', 'pendiente_pago'); 

-- 3.4 Historial de Cambios
CREATE TABLE IF NOT EXISTS el_dep_club_suscripcion_historial ( 
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(), 
   club_suscripcion_id uuid NOT NULL REFERENCES el_dep_club_suscripciones(id) ON DELETE CASCADE, 
 
   estado_anterior el_dep_suscripcion_estado, 
   estado_nuevo el_dep_suscripcion_estado NOT NULL, 
 
   plan_anterior_id uuid REFERENCES el_dep_planes(id), 
   plan_nuevo_id uuid REFERENCES el_dep_planes(id), 
 
   motivo text, 
   cambiado_por uuid REFERENCES el_dep_identidades(id), 
   created_at timestamptz NOT NULL DEFAULT now() 
); 

CREATE INDEX IF NOT EXISTS el_dep_club_suscripcion_historial_idx 
ON el_dep_club_suscripcion_historial (club_suscripcion_id, created_at DESC); 


-- SEED DATA (Insertar planes por defecto)
INSERT INTO el_dep_planes (codigo, nombre, tier, descripcion, precio_mensual, precio_anual) 
VALUES 
('barrio_libre', 'Barrio Libre', 'free', 'Para partir sin excusas', 0, 0), 
('barrio_ordenado', 'Barrio Ordenado', 'medio', 'Asistencia + pagos + reportes básicos', 9990, 9990*10), 
('barrio_pro', 'Barrio Pro', 'pro', 'Finanzas + notificaciones + gestión completa', 17990, 17990*10)
ON CONFLICT (codigo) DO NOTHING;

-- límites 
INSERT INTO el_dep_plan_limites (plan_id, max_jugadores, max_admins, permite_eventos_pago, permite_reportes, permite_finanzas, permite_notificaciones_email) 
SELECT id, 
   CASE codigo WHEN 'barrio_libre' THEN 25 ELSE NULL END, 
   CASE codigo WHEN 'barrio_libre' THEN 1 WHEN 'barrio_ordenado' THEN 2 ELSE 5 END, 
   (codigo IN ('barrio_ordenado','barrio_pro')), 
   (codigo IN ('barrio_ordenado','barrio_pro')), 
   (codigo IN ('barrio_pro')), 
   (codigo IN ('barrio_pro')) 
FROM el_dep_planes
ON CONFLICT (plan_id) DO NOTHING; 

-- Suscripción Default para clubes existentes (Opcional, ejecutar con cuidado)
-- INSERT INTO el_dep_club_suscripciones (club_id, plan_id, estado, billing_period, fecha_inicio, fecha_fin, auto_renovar) 
-- SELECT c.id, 
--        p.id, 
--        'activa'::el_dep_suscripcion_estado, 
--        'mensual'::el_dep_billing_period, 
--        CURRENT_DATE, 
--        NULL, 
--        false 
-- FROM el_dep_clubes c 
-- CROSS JOIN LATERAL ( 
--   SELECT id FROM el_dep_planes WHERE codigo = 'barrio_libre' LIMIT 1 
-- ) p 
-- WHERE NOT EXISTS ( 
--   SELECT 1 FROM el_dep_club_suscripciones s WHERE s.club_id = c.id 
-- );
