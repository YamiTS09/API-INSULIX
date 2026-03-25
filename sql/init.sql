-- =============================================
-- INSULIX - Base de Datos (PostgreSQL)
-- Basado en el modelo original (MO_DATOS) + Enfoque de Seguridad Unificado
-- =============================================

-- 1. EXTENSIONES PARA UUID (Estándar RFC 4122)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums personalizados para simplificar consultas y garantizar tipos de datos
CREATE TYPE sexo_tipo AS ENUM ('M', 'F', 'Otro');
CREATE TYPE diabetes_tipo AS ENUM ('Tipo 1', 'Tipo 2', 'Gestacional', 'Otro');
CREATE TYPE categoria_alimento AS ENUM ('Desayuno', 'Comida', 'Cena', 'Colación');

-- =============================================
-- MÓDULO A: SEGURIDAD Y ACCESO (RBAC UNIFICADO)
-- =============================================

-- Tabla de Roles
CREATE TABLE roles (
    rol_id SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(20) UNIQUE NOT NULL, -- 'MEDICO', 'PACIENTE', 'ADMIN'
    descripcion VARCHAR(255)
);

-- Tabla de Usuarios General (Inicio de Sesión Unificado)
-- *AQUÍ ENTRAN TODOS: Médicos, Pacientes y Administradores*
CREATE TABLE usuario (
    usuario_id VARCHAR(50) PRIMARY KEY,
    rol_id INT NOT NULL REFERENCES roles(rol_id),
    email VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    apellido_paterno VARCHAR(40),
    apellido_materno VARCHAR(40),
    password_hash VARCHAR(255), -- PUEDE SER NULO porque usamos Firebase
    intentos_fallidos INT DEFAULT 0,
    bloqueado_hasta TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- ISO 8601
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =============================================
-- MÓDULO B: PERFILES DE USUARIO ESPECÍFICOS
-- =============================================

-- B.1 Detalle para el Administrador (Nuevo)
CREATE TABLE detalle_admin (
    admin_id VARCHAR(50) PRIMARY KEY REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    cargo VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    telefono VARCHAR(15) UNIQUE
);

-- B.2 Detalle para el Médico (Adaptado)
CREATE TABLE detalle_medico (
    medico_id VARCHAR(50) PRIMARY KEY REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    cedula_profesional VARCHAR(20) UNIQUE NOT NULL,
    especialidad VARCHAR(100), -- Agregado para más contexto
    hospital VARCHAR(150),     -- Agregado para referenciar clínica/hospital
    telefono VARCHAR(15) UNIQUE NOT NULL,      -- Estándar E.164
    foto_url VARCHAR(500)
);

-- B.3 Detalle para el Paciente (Combinación de tu documento + mis sugerencias)
CREATE TABLE detalle_paciente (
    paciente_id VARCHAR(50) PRIMARY KEY REFERENCES usuario(usuario_id) ON DELETE CASCADE,
    medico_id VARCHAR(50) NOT NULL REFERENCES detalle_medico(medico_id), -- Médico asignado
    edad INT NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    sexo sexo_tipo NOT NULL,
    tipo_diabetes diabetes_tipo NOT NULL,
    glucosa_base DECIMAL(5,2), -- Meta o base de glucosa mg/dL
    peso DECIMAL(5,2),         -- en kg
    estatura DECIMAL(4,2),     -- en metros
    telefono VARCHAR(15) UNIQUE NOT NULL,
    direccion VARCHAR(255),
    foto_url VARCHAR(500)
);


-- =============================================
-- MÓDULO C: TELEMETRÍA Y SENSOR (INTEROPERABILIDAD)
-- Manteniendo tus tablas de FreeStyle tal cual
-- =============================================

-- Información del hardware (Sensor FreeStyle)
CREATE TABLE dispositivo_sensor (
    sensor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id VARCHAR(50) NOT NULL REFERENCES detalle_paciente(paciente_id) ON DELETE CASCADE,
    numero_serie VARCHAR(50) UNIQUE NOT NULL,
    modelo VARCHAR(100),
    fecha_activacion TIMESTAMP NOT NULL -- Inicio de los 14 días
);

-- Historial de lecturas (Datos de solo lectura para el paciente)
CREATE TABLE historial_glucosa (
    lectura_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id UUID NOT NULL REFERENCES dispositivo_sensor(sensor_id) ON DELETE CASCADE,
    valor_mgdl DECIMAL(5,2) NOT NULL, -- ISO 80000-9
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- ISO 8601
);


-- =============================================
-- MÓDULO D: PRESCRIPCIONES Y TRATAMIENTO
-- Ampliado con tus tablas
-- =============================================

-- D.1 Planes de dieta
CREATE TABLE plan_alimenticio (
    dieta_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id VARCHAR(50) NOT NULL REFERENCES detalle_paciente(paciente_id) ON DELETE CASCADE,
    medico_id VARCHAR(50) NOT NULL REFERENCES detalle_medico(medico_id),
    categoria categoria_alimento NOT NULL,
    platillo TEXT NOT NULL,
    bebida TEXT,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- D.2 Planes de actividad física
CREATE TABLE actividad_fisica (
    actividad_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id VARCHAR(50) NOT NULL REFERENCES detalle_paciente(paciente_id) ON DELETE CASCADE,
    medico_id VARCHAR(50) NOT NULL REFERENCES detalle_medico(medico_id),
    nombre_ejercicio VARCHAR(100) NOT NULL,
    duracion_min INT,
    notas_medicas TEXT,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- D.3 Tratamientos o Medicamentos (Tratamiento Farmacológico)
CREATE TABLE tratamiento_farmacologico (
    tratamiento_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paciente_id VARCHAR(50) NOT NULL REFERENCES detalle_paciente(paciente_id) ON DELETE CASCADE,
    medico_id VARCHAR(50) NOT NULL REFERENCES detalle_medico(medico_id),
    medicamento VARCHAR(150) NOT NULL,
    dosis VARCHAR(100) NOT NULL,
    frecuencia VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    activo BOOLEAN DEFAULT TRUE,
    notas TEXT,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =============================================
-- ÍNDICES para performance
-- =============================================
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_paciente_medico ON detalle_paciente(medico_id);
CREATE INDEX idx_sensor_paciente ON dispositivo_sensor(paciente_id);
CREATE INDEX idx_historial_sensor ON historial_glucosa(sensor_id);
CREATE INDEX idx_historial_fecha ON historial_glucosa(fecha_hora);

-- =============================================
-- FUNCIÓN y TRIGGER: Actualizar updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuario_updated_at
    BEFORE UPDATE ON usuario
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =============================================
-- INSERCIÓN DE DATOS INICIALES (Mock Data)
-- Contraseña todos: "123456" 
-- =============================================
INSERT INTO roles (nombre_rol, descripcion) VALUES 
('ADMIN', 'Acceso total a la plataforma web'),
('MEDICO', 'Acceso a gestión de pacientes y prescripciones (Web y Móvil)'),
('PACIENTE', 'Acceso a consulta de historial y tratamiento (Móvil)');

-- Al usar UUID necesitamos variables o subconsultas para enlazar los IDs.
-- Ejemplo de cómo insertarías un médico y un paciente:
/*
WITH nuevo_medico AS (
    INSERT INTO usuario (rol_id, email, password_hash) 
    VALUES ((SELECT rol_id FROM roles WHERE nombre_rol = 'MEDICO'), 'dr.garcia@insulix.com', '$2b$10$xPBm5...hash') 
    RETURNING usuario_id
)
INSERT INTO detalle_medico (medico_id, nombre, apellido_paterno, apellido_materno, cedula_profesional, especialidad)
SELECT usuario_id, 'Carlos', 'García', 'Pérez', 'CED-12345', 'Endocrinología' FROM nuevo_medico;
*/

-- =============================================
-- MÓDULO E: SEGURIDAD EXTRA (2FA)
-- =============================================
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

-- =============================================
-- SEMILLA DE USUARIO ADMINISTRADOR
-- =============================================
INSERT INTO usuario (usuario_id, rol_id, email, nombre, password_hash) 
VALUES ('tK3HY28MXhbyDHB4ntq439tufS03', (SELECT rol_id FROM roles WHERE nombre_rol = 'ADMIN'), 'admin@insulix.com', 'Admin', '!4dM1N2026');

INSERT INTO detalle_admin (admin_id, cargo, departamento)
VALUES ('tK3HY28MXhbyDHB4ntq439tufS03', 'Administrador', 'Desarrollador Web');
