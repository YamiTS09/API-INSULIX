BEGIN;

DO $$
BEGIN
    CREATE TYPE glucosa_origen AS ENUM ('SENSOR', 'MEDICO', 'PACIENTE', 'SIMULADOR');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE historial_glucosa
    ADD COLUMN IF NOT EXISTS paciente_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS registrado_por VARCHAR(50),
    ADD COLUMN IF NOT EXISTS origen glucosa_origen;

-- Las lecturas existentes pertenecen al mismo paciente que su sensor.
UPDATE historial_glucosa hg
SET paciente_id = ds.paciente_id,
    origen = CASE
        WHEN ds.es_simulado THEN 'SIMULADOR'::glucosa_origen
        ELSE 'SENSOR'::glucosa_origen
    END
FROM dispositivo_sensor ds
WHERE hg.sensor_id = ds.sensor_id
  AND (hg.paciente_id IS NULL OR hg.origen IS NULL);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM historial_glucosa WHERE paciente_id IS NULL OR origen IS NULL) THEN
        RAISE EXCEPTION 'No se pudo identificar paciente u origen para todas las lecturas existentes';
    END IF;
END $$;

ALTER TABLE historial_glucosa
    ALTER COLUMN paciente_id SET NOT NULL,
    ALTER COLUMN sensor_id DROP NOT NULL,
    ALTER COLUMN origen SET NOT NULL;

ALTER TABLE historial_glucosa
    DROP CONSTRAINT IF EXISTS historial_glucosa_sensor_id_fkey;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'historial_glucosa_paciente_id_fkey'
    ) THEN
        ALTER TABLE historial_glucosa
            ADD CONSTRAINT historial_glucosa_paciente_id_fkey
            FOREIGN KEY (paciente_id) REFERENCES detalle_paciente(paciente_id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'historial_glucosa_sensor_id_fkey'
    ) THEN
        ALTER TABLE historial_glucosa
            ADD CONSTRAINT historial_glucosa_sensor_id_fkey
            FOREIGN KEY (sensor_id) REFERENCES dispositivo_sensor(sensor_id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'historial_glucosa_registrado_por_fkey'
    ) THEN
        ALTER TABLE historial_glucosa
            ADD CONSTRAINT historial_glucosa_registrado_por_fkey
            FOREIGN KEY (registrado_por) REFERENCES usuario(usuario_id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'historial_glucosa_origen_sensor_valido'
    ) THEN
        ALTER TABLE historial_glucosa
            ADD CONSTRAINT historial_glucosa_origen_sensor_valido CHECK (
                (origen IN ('SENSOR', 'SIMULADOR') AND sensor_id IS NOT NULL)
                OR (origen IN ('MEDICO', 'PACIENTE') AND sensor_id IS NULL)
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_historial_glucosa_paciente_fecha
    ON historial_glucosa(paciente_id, fecha_hora DESC);

-- Conserva cualquier glucosa_base válida como primera lectura manual del médico.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'detalle_paciente'
          AND column_name = 'glucosa_base'
    ) THEN
        INSERT INTO historial_glucosa
            (paciente_id, sensor_id, valor_mgdl, fecha_hora, registrado_por, origen)
        SELECT dp.paciente_id,
               NULL,
               dp.glucosa_base,
               COALESCE(u.fecha_registro AT TIME ZONE 'UTC', CURRENT_TIMESTAMP),
               dp.medico_id,
               'MEDICO'::glucosa_origen
        FROM detalle_paciente dp
        JOIN usuario u ON u.usuario_id = dp.paciente_id
        WHERE dp.glucosa_base BETWEEN 20 AND 600
          AND NOT EXISTS (
              SELECT 1
              FROM historial_glucosa hg
              WHERE hg.paciente_id = dp.paciente_id
                AND hg.sensor_id IS NULL
                AND hg.origen = 'MEDICO'
                AND hg.valor_mgdl = dp.glucosa_base
          );

        ALTER TABLE detalle_paciente DROP COLUMN glucosa_base;
    END IF;
END $$;

COMMIT;
