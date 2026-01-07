
-- Tabla para registrar transacciones de Webpay Plus
CREATE TABLE el_dep_pagos_webpay (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    club_id UUID REFERENCES el_dep_clubes(id), -- Opcional si es global
    usuario_id UUID REFERENCES el_dep_identidades(id),
    
    -- Datos de la Orden (Negocio)
    buy_order VARCHAR(50) NOT NULL UNIQUE, -- Orden de compra única en nuestro sistema
    session_id VARCHAR(100) NOT NULL, -- ID de sesión para trazabilidad
    amount INTEGER NOT NULL, -- Monto en pesos chilenos (CLP no usa decimales)
    
    -- Estado del pago
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, AUTHORIZED, REJECTED, CANCELLED, REVERSED, NULLIFIED
    
    -- Datos de Transbank
    token VARCHAR(255), -- Token entregado por TBK en create
    authorization_code VARCHAR(50), -- Código de autorización (solo si aprobado)
    payment_type_code VARCHAR(10), -- VD, VN, SI, etc.
    response_code INTEGER, -- 0 = Aprobado
    installments_number INTEGER DEFAULT 0, -- Cuotas
    
    -- Fechas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    transaction_date TIMESTAMPTZ, -- Fecha real de la transacción en TBK
    
    -- Auditoría / Metadata
    raw_response JSONB, -- Respuesta completa de TBK para debug
    metadata JSONB -- Para guardar info extra (ej: items comprados)
);

-- Índices para búsqueda rápida
CREATE INDEX idx_pagos_token ON el_dep_pagos_webpay(token);
CREATE INDEX idx_pagos_buy_order ON el_dep_pagos_webpay(buy_order);
CREATE INDEX idx_pagos_usuario ON el_dep_pagos_webpay(usuario_id);
