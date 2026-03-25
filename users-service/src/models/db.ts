import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'insulix_db',
  password: process.env.DB_PASSWORD || 'secretpassword',
  port: Number(process.env.DB_PORT) || 5432,
});

// Inicializar tablas según el nuevo esquema propuesto
const initializeDb = async () => {
    try {
        await pool.query(`
            -- Enums personalizados
            DO $$ BEGIN
                CREATE TYPE sexo_tipo AS ENUM ('M', 'F', 'Otro');
            EXCEPTION WHEN duplicate_object THEN null; END $$;

            DO $$ BEGIN
                CREATE TYPE diabetes_tipo AS ENUM ('Tipo 1', 'Tipo 2', 'Gestacional', 'Otro');
            EXCEPTION WHEN duplicate_object THEN null; END $$;

-- MÓDULO A: SEGURIDAD Y ACCESO
CREATE TABLE IF NOT EXISTS roles (
    rol_id SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(20) UNIQUE NOT NULL,
    descripcion VARCHAR(255)
    -- Eliminamos cualquier CHECK manual aquí para evitar el error previo
);

-- Aseguramos que los nombres coincidan exactamente con lo que busca tu controlador
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
                edad INT NOT NULL,
                fecha_nacimiento DATE NOT NULL,
                sexo sexo_tipo NOT NULL,
                tipo_diabetes diabetes_tipo NOT NULL,
                glucosa_base DECIMAL(5,2),
                peso DECIMAL(5,2),
                estatura DECIMAL(4,2),
                telefono VARCHAR(15) UNIQUE NOT NULL,
                direccion VARCHAR(255),
                foto_url VARCHAR(500)
            );

            -- Triggers para updated_at (Evitamos crearlo si ya existe usando OR REPLACE)
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

        `);
        console.log("Database schema updated with new unified model (Roles, Usuario, Detalle_Medico, Detalle_Paciente)");
    } catch (err) {
        console.error("Error initializing DB:", err);
    }
}

initializeDb();
