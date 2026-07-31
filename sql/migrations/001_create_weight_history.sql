-- INSULIX - Migración del peso del perfil a un historial de mediciones
-- IMPORTANTE: ejecutar solo después de desplegar el users-service actualizado.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
    CREATE TYPE peso_origen AS ENUM ('MEDICO', 'PACIENTE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS historial_peso (
    peso_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id VARCHAR(50) NOT NULL
        REFERENCES detalle_paciente(paciente_id) ON DELETE CASCADE,
    valor_kg DECIMAL(5,2) NOT NULL
        CHECK (valor_kg BETWEEN 30 AND 200),
    fecha_medicion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registrado_por VARCHAR(50)
        REFERENCES usuario(usuario_id) ON DELETE SET NULL,
    origen peso_origen NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_historial_peso_paciente_fecha
    ON historial_peso(paciente_id, fecha_medicion DESC);

-- Los pesos anteriores no se migran porque no cuentan con una fecha de medición confiable.
ALTER TABLE detalle_paciente
    DROP COLUMN IF EXISTS peso;

COMMIT;
