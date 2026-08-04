import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
    // Usamos la URL completa que Render nos da
    connectionString: process.env.DATABASE_URL as string,
    // Obligatorio para bases de datos en la nube
    ssl: {
        rejectUnauthorized: false
    }
});

// Inicializar tablas según el nuevo esquema propuesto
const initializeDb = async () => {
    try {
        await pool.query(`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

            -- Enums personalizados
            DO $$ BEGIN
                CREATE TYPE sexo_tipo AS ENUM ('M', 'F', 'Otro');
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                CREATE TYPE diabetes_tipo AS ENUM ('Tipo 1', 'Tipo 2', 'Gestacional', 'Otro');
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                CREATE TYPE peso_origen AS ENUM ('MEDICO', 'PACIENTE');
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                CREATE TYPE glucosa_origen AS ENUM ('SENSOR', 'MEDICO', 'PACIENTE', 'SIMULADOR');
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            -- MÓDULO A: SEGURIDAD Y ACCESO
            CREATE TABLE IF NOT EXISTS roles (
                rol_id SERIAL PRIMARY KEY,
                nombre_rol VARCHAR(20) UNIQUE NOT NULL,
                descripcion VARCHAR(255)
            );

            -- Aseguramos los roles iniciales
            INSERT INTO roles (nombre_rol, descripcion) 
            VALUES 
                ('ADMIN', 'Acceso total a la plataforma web'),
                ('MEDICO', 'Acceso a gestión de pacientes y prescripciones (Web y Móvil)'),
                ('PACIENTE', 'Acceso a consulta de historial y tratamiento (Móvil)')
            ON CONFLICT (nombre_rol) DO NOTHING;

            CREATE TABLE IF NOT EXISTS usuario (
                usuario_id VARCHAR(50) PRIMARY KEY, -- Firebase UID
                rol_id INT NOT NULL REFERENCES roles(rol_id),
                email VARCHAR(100) UNIQUE NOT NULL,
                nombre VARCHAR(50) NOT NULL,
                apellido_paterno VARCHAR(40),
                apellido_materno VARCHAR(40),
                password_hash VARCHAR(255),
                intentos_fallidos INT DEFAULT 0,
                bloqueado_hasta TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                is_2fa_enabled BOOLEAN DEFAULT FALSE,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- MÓDULO B: PERFILES
            CREATE TABLE IF NOT EXISTS detalle_admin (
                admin_id VARCHAR(50) PRIMARY KEY REFERENCES usuario(usuario_id) ON DELETE CASCADE,
                cargo VARCHAR(100) NOT NULL,
                departamento VARCHAR(100) NOT NULL,
                telefono VARCHAR(15) UNIQUE
            );

            CREATE TABLE IF NOT EXISTS detalle_medico (
                medico_id VARCHAR(50) PRIMARY KEY REFERENCES usuario(usuario_id) ON DELETE CASCADE,
                cedula_profesional VARCHAR(20) UNIQUE NOT NULL,
                especialidad VARCHAR(100),
                hospital VARCHAR(150),
                telefono VARCHAR(15) UNIQUE NOT NULL,
                foto_url VARCHAR(500)
            );

            CREATE TABLE IF NOT EXISTS detalle_paciente (
                paciente_id VARCHAR(50) PRIMARY KEY REFERENCES usuario(usuario_id) ON DELETE CASCADE,
                medico_id VARCHAR(50) NOT NULL REFERENCES detalle_medico(medico_id),
                fecha_nacimiento DATE NOT NULL,
                sexo sexo_tipo NOT NULL,
                tipo_diabetes diabetes_tipo NOT NULL,
                estatura DECIMAL(4,2),
                telefono VARCHAR(15) UNIQUE NOT NULL,
                direccion VARCHAR(255),
                foto_url VARCHAR(500)
            );

            CREATE TABLE IF NOT EXISTS historial_peso (
                peso_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                paciente_id VARCHAR(50) NOT NULL REFERENCES detalle_paciente(paciente_id) ON DELETE CASCADE,
                valor_kg DECIMAL(5,2) NOT NULL CHECK (valor_kg BETWEEN 30 AND 200),
                fecha_medicion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                registrado_por VARCHAR(50) REFERENCES usuario(usuario_id) ON DELETE SET NULL,
                origen peso_origen NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_historial_peso_paciente_fecha
                ON historial_peso(paciente_id, fecha_medicion DESC);

            CREATE TABLE IF NOT EXISTS dispositivo_sensor (
                sensor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                paciente_id VARCHAR(50) NOT NULL REFERENCES detalle_paciente(paciente_id) ON DELETE CASCADE,
                numero_serie VARCHAR(50) UNIQUE NOT NULL,
                modelo VARCHAR(100),
                fecha_activacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_desactivacion TIMESTAMPTZ,
                activo BOOLEAN NOT NULL DEFAULT TRUE,
                es_simulado BOOLEAN NOT NULL DEFAULT FALSE,
                CONSTRAINT dispositivo_sensor_fechas_validas
                    CHECK (fecha_desactivacion IS NULL OR fecha_desactivacion >= fecha_activacion)
            );

            CREATE TABLE IF NOT EXISTS historial_glucosa (
                lectura_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                paciente_id VARCHAR(50) NOT NULL REFERENCES detalle_paciente(paciente_id) ON DELETE CASCADE,
                sensor_id UUID REFERENCES dispositivo_sensor(sensor_id) ON DELETE RESTRICT,
                valor_mgdl DECIMAL(5,2) NOT NULL,
                fecha_hora TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                registrado_por VARCHAR(50) REFERENCES usuario(usuario_id) ON DELETE SET NULL,
                origen glucosa_origen NOT NULL,
                CONSTRAINT historial_glucosa_valor_valido
                    CHECK (valor_mgdl BETWEEN 20 AND 600),
                CONSTRAINT historial_glucosa_origen_sensor_valido CHECK (
                    (origen IN ('SENSOR', 'SIMULADOR') AND sensor_id IS NOT NULL)
                    OR (origen IN ('MEDICO', 'PACIENTE') AND sensor_id IS NULL)
                )
            );

            CREATE INDEX IF NOT EXISTS idx_sensor_paciente
                ON dispositivo_sensor(paciente_id);

            CREATE INDEX IF NOT EXISTS idx_historial_glucosa_paciente_fecha
                ON historial_glucosa(paciente_id, fecha_hora DESC);

            CREATE UNIQUE INDEX IF NOT EXISTS uq_historial_glucosa_sensor_fecha
                ON historial_glucosa(sensor_id, fecha_hora);

            CREATE TABLE IF NOT EXISTS configuracion_usuario (
                usuario_id VARCHAR(50) PRIMARY KEY REFERENCES usuario(usuario_id) ON DELETE CASCADE,
                tema_oscuro BOOLEAN DEFAULT FALSE,
                idioma VARCHAR(10) DEFAULT 'es',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Triggers para updated_at
            CREATE OR REPLACE FUNCTION update_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_usuario_updated_at ON usuario;
            CREATE TRIGGER trg_usuario_updated_at
                BEFORE UPDATE ON usuario
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at();

            -- MÓDULO E: SEGURIDAD EXTRA (2FA)
            CREATE TABLE IF NOT EXISTS codigos_verificacion (
                id SERIAL PRIMARY KEY,
                usuario_id VARCHAR(50) NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
                codigo VARCHAR(6) NOT NULL,
                expira_en TIMESTAMP NOT NULL,
                intentos INT DEFAULT 0,
                usado BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_codigos_usuario ON codigos_verificacion(usuario_id);

            CREATE TABLE IF NOT EXISTS codigos_registro (
                id SERIAL PRIMARY KEY,
                email VARCHAR(100) NOT NULL,
                codigo VARCHAR(6) NOT NULL,
                expira_en TIMESTAMP NOT NULL,
                intentos INT DEFAULT 0,
                usado BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_codigos_registro_email ON codigos_registro(email);
        `);

        // Migración segura para tablas ya existentes
        await pool.query(`
            ALTER TABLE usuario ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;
            
            -- Eliminar columna edad calculada estática (se calcula dinámicamente)
            ALTER TABLE detalle_paciente DROP COLUMN IF EXISTS edad;
        `);

        console.log("Database schema updated with new unified model (Roles, Usuario, Configuracion, etc.)");
    } catch (err) {
        console.error("Error initializing DB:", err);
    }
}

initializeDb();
