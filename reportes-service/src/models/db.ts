import dotenv from 'dotenv';
import { Pool, PoolConfig } from 'pg';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const isLocalUrl = databaseUrl
    ? /@(localhost|127\.0\.0\.1)(:\d+)?\//i.test(databaseUrl)
    : false;

const config: PoolConfig = databaseUrl
    ? {
        connectionString: databaseUrl,
        ssl: process.env.DB_SSL === 'false' || isLocalUrl
            ? false
            : { rejectUnauthorized: false }
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || 'admin',
        password: process.env.DB_PASSWORD || 'secretpassword',
        database: process.env.DB_NAME || 'insulix_db',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

export const pool = new Pool(config);

export const initializeDatabase = async (): Promise<void> => {
    await pool.query(`
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

        CREATE TABLE IF NOT EXISTS historial_glucosa (
            lectura_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            sensor_id UUID NOT NULL REFERENCES dispositivo_sensor(sensor_id) ON DELETE CASCADE,
            valor_mgdl DECIMAL(5,2) NOT NULL,
            fecha_hora TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE historial_glucosa
            ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

        CREATE INDEX IF NOT EXISTS idx_sensor_paciente
            ON dispositivo_sensor(paciente_id);
        CREATE INDEX IF NOT EXISTS idx_historial_sensor_fecha
            ON historial_glucosa(sensor_id, fecha_hora DESC);
        CREATE INDEX IF NOT EXISTS idx_historial_fecha
            ON historial_glucosa(fecha_hora DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_historial_glucosa_sensor_fecha
            ON historial_glucosa(sensor_id, fecha_hora);
    `);

    await pool.query(`
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

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'dispositivo_sensor_fechas_validas'
            ) THEN
                ALTER TABLE dispositivo_sensor
                    ADD CONSTRAINT dispositivo_sensor_fechas_validas
                    CHECK (fecha_desactivacion IS NULL OR fecha_desactivacion >= fecha_activacion);
            END IF;
        END $$;
    `);
};
