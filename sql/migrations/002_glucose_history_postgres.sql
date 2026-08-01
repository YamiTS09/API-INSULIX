BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS dispositivo_sensor (
    sensor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id VARCHAR(50) NOT NULL REFERENCES detalle_paciente(paciente_id) ON DELETE CASCADE,
    numero_serie VARCHAR(50) UNIQUE NOT NULL,
    modelo VARCHAR(100),
    fecha_activacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_desactivacion TIMESTAMPTZ,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    es_simulado BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE dispositivo_sensor
    ADD COLUMN IF NOT EXISTS fecha_desactivacion TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS es_simulado BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dispositivo_sensor'
          AND column_name = 'fecha_activacion'
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE dispositivo_sensor
            ALTER COLUMN fecha_activacion TYPE TIMESTAMPTZ
            USING fecha_activacion AT TIME ZONE 'UTC';
    END IF;
END $$;

ALTER TABLE dispositivo_sensor
    ALTER COLUMN fecha_activacion SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN fecha_activacion SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'dispositivo_sensor_fechas_validas'
    ) THEN
        ALTER TABLE dispositivo_sensor
            ADD CONSTRAINT dispositivo_sensor_fechas_validas
            CHECK (fecha_desactivacion IS NULL OR fecha_desactivacion >= fecha_activacion);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS historial_glucosa (
    lectura_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id UUID NOT NULL REFERENCES dispositivo_sensor(sensor_id) ON DELETE CASCADE,
    valor_mgdl DECIMAL(5,2) NOT NULL,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE historial_glucosa
    ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'historial_glucosa'
          AND column_name = 'fecha_hora'
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE historial_glucosa
            ALTER COLUMN fecha_hora TYPE TIMESTAMPTZ
            USING fecha_hora AT TIME ZONE 'UTC';
    END IF;
END $$;

ALTER TABLE historial_glucosa
    ALTER COLUMN fecha_hora SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN fecha_hora SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'historial_glucosa_valor_valido'
    ) THEN
        ALTER TABLE historial_glucosa
            ADD CONSTRAINT historial_glucosa_valor_valido
            CHECK (valor_mgdl BETWEEN 20 AND 600) NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sensor_paciente
    ON dispositivo_sensor(paciente_id);
CREATE INDEX IF NOT EXISTS idx_historial_sensor_fecha
    ON historial_glucosa(sensor_id, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_historial_fecha
    ON historial_glucosa(fecha_hora DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_historial_glucosa_sensor_fecha
    ON historial_glucosa(sensor_id, fecha_hora);

COMMIT;
