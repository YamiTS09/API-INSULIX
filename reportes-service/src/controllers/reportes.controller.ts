import { Response } from 'express';
import { pool } from '../models/db';
import { AuthRequest, AuthUser } from '../middlewares/jwt.middleware';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_GLUCOSE = 20;
const MAX_GLUCOSE = 600;

const canAccessPatient = async (patientId: string, user?: AuthUser): Promise<boolean> => {
    if (!user?.uid || !user.role) return false;

    if (user.role === 'ADMIN') {
        const result = await pool.query(
            `SELECT 1
             FROM detalle_paciente p
             JOIN usuario u ON u.usuario_id = p.paciente_id
             WHERE p.paciente_id = $1 AND u.is_active = TRUE`,
            [patientId]
        );
        return result.rowCount === 1;
    }

    if (user.role === 'PACIENTE' && user.uid === patientId) {
        const result = await pool.query(
            `SELECT 1
             FROM detalle_paciente p
             JOIN usuario u ON u.usuario_id = p.paciente_id
             WHERE p.paciente_id = $1 AND u.is_active = TRUE`,
            [patientId]
        );
        return result.rowCount === 1;
    }

    if (user.role === 'MEDICO') {
        const result = await pool.query(
            `SELECT 1
             FROM detalle_paciente p
             JOIN usuario u ON u.usuario_id = p.paciente_id
             WHERE p.paciente_id = $1
               AND p.medico_id = $2
               AND u.is_active = TRUE`,
            [patientId, user.uid]
        );
        return result.rowCount === 1;
    }

    return false;
};

const parseDate = (value: unknown, endOfDay = false): Date | null => {
    if (typeof value !== 'string' || !value.trim()) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
        : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

const serializeReading = (row: any) => ({
    ...row,
    _id: row.lectura_id,
    valor_mgdl: Number(row.valor_mgdl)
});

const getSensor = async (sensorId: string) => {
    if (!UUID_PATTERN.test(sensorId)) return null;
    const result = await pool.query(
        `SELECT sensor_id, paciente_id, numero_serie, modelo, fecha_activacion,
                fecha_desactivacion, activo, es_simulado
         FROM dispositivo_sensor
         WHERE sensor_id = $1`,
        [sensorId]
    );
    return result.rows[0] ?? null;
};

export const registrarSensor = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = String(req.body.paciente_id ?? '').trim();
        const serialNumber = String(req.body.numero_serie ?? '').trim();
        const model = req.body.modelo ? String(req.body.modelo).trim() : null;
        const activationDate = req.body.fecha_activacion
            ? parseDate(req.body.fecha_activacion)
            : new Date();

        if (!patientId) {
            return res.status(400).json({ message: 'paciente_id es obligatorio' });
        }
        if (!serialNumber || serialNumber.length > 50) {
            return res.status(400).json({ message: 'numero_serie es obligatorio y admite hasta 50 caracteres' });
        }
        if (model && model.length > 100) {
            return res.status(400).json({ message: 'modelo admite hasta 100 caracteres' });
        }
        if (!activationDate) {
            return res.status(400).json({ message: 'fecha_activacion no es valida' });
        }
        if (!await canAccessPatient(patientId, req.user)) {
            return res.status(403).json({ message: 'No tienes acceso a este paciente' });
        }

        const result = await pool.query(
            `INSERT INTO dispositivo_sensor
                (paciente_id, numero_serie, modelo, fecha_activacion, es_simulado)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [patientId, serialNumber, model, activationDate.toISOString(), Boolean(req.body.es_simulado)]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Ya existe un sensor con ese numero de serie' });
        }
        return res.status(500).json({ error: 'Error registrando el sensor', details: error.message });
    }
};

export const listarSensores = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = String(req.params.pacienteId);
        if (!await canAccessPatient(patientId, req.user)) {
            return res.status(403).json({ message: 'No tienes acceso a este paciente' });
        }

        const result = await pool.query(
            `SELECT *
             FROM dispositivo_sensor
             WHERE paciente_id = $1
             ORDER BY activo DESC, fecha_activacion DESC`,
            [patientId]
        );
        return res.status(200).json({ sensores: result.rows });
    } catch (error: any) {
        return res.status(500).json({ error: 'Error obteniendo los sensores', details: error.message });
    }
};

export const agregarLectura = async (req: AuthRequest, res: Response) => {
    try {
        const glucose = Number(req.body.valor_mgdl);
        if (!Number.isFinite(glucose) || glucose < MIN_GLUCOSE || glucose > MAX_GLUCOSE) {
            return res.status(400).json({
                message: `valor_mgdl debe estar entre ${MIN_GLUCOSE} y ${MAX_GLUCOSE}`
            });
        }

        const measuredAt = req.body.fecha_hora ? parseDate(req.body.fecha_hora) : new Date();
        if (!measuredAt) {
            return res.status(400).json({ message: 'fecha_hora no es valida' });
        }
        if (measuredAt.getTime() > Date.now() + 5 * 60 * 1000) {
            return res.status(400).json({ message: 'fecha_hora no puede estar en el futuro' });
        }

        let sensor: any = null;
        let patientId = '';
        let origin: 'SENSOR' | 'MEDICO' | 'PACIENTE' | 'SIMULADOR';
        let registeredBy: string | null = null;

        if (req.body.sensor_id) {
            sensor = await getSensor(String(req.body.sensor_id));
            if (!sensor) {
                return res.status(404).json({ message: 'No se encontro el sensor indicado' });
            }
            if (!sensor.activo) {
                return res.status(409).json({ message: 'El sensor esta desactivado' });
            }
            patientId = sensor.paciente_id;
            origin = sensor.es_simulado ? 'SIMULADOR' : 'SENSOR';
        } else {
            if (req.user?.role === 'ADMIN') {
                return res.status(403).json({
                    message: 'Un administrador no puede registrar una lectura manual'
                });
            }

            patientId = req.user?.role === 'PACIENTE'
                ? String(req.user.uid)
                : String(req.body.paciente_id ?? '').trim();
            if (!patientId) {
                return res.status(400).json({
                    message: 'paciente_id es obligatorio para una lectura manual del medico'
                });
            }
            origin = req.user?.role === 'MEDICO' ? 'MEDICO' : 'PACIENTE';
            registeredBy = req.user?.uid ?? null;
        }

        if (!await canAccessPatient(patientId, req.user)) {
            return res.status(403).json({ message: 'No tienes acceso a este paciente' });
        }

        const result = await pool.query(
            `INSERT INTO historial_glucosa
                (paciente_id, sensor_id, valor_mgdl, fecha_hora, registrado_por, origen)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (sensor_id, fecha_hora) DO NOTHING
             RETURNING *`,
            [
                patientId,
                sensor?.sensor_id ?? null,
                glucose,
                measuredAt.toISOString(),
                registeredBy,
                origin
            ]
        );

        if (result.rowCount === 0) {
            return res.status(409).json({ message: 'Ya existe una lectura del sensor para esa fecha y hora' });
        }
        return res.status(201).json(serializeReading(result.rows[0]));
    } catch (error: any) {
        return res.status(500).json({ error: 'Error agregando la lectura de glucosa', details: error.message });
    }
};

export const getHistorialPaciente = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = String(req.params.id);
        if (!await canAccessPatient(patientId, req.user)) {
            return res.status(403).json({ message: 'No tienes acceso a este paciente' });
        }

        const startDate = req.query.startDate ? parseDate(req.query.startDate) : null;
        const endDate = req.query.endDate ? parseDate(req.query.endDate, true) : null;
        if ((req.query.startDate && !startDate) || (req.query.endDate && !endDate)) {
            return res.status(400).json({ message: 'El rango de fechas no es valido' });
        }
        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({ message: 'startDate no puede ser posterior a endDate' });
        }

        const parsedLimit = Number.parseInt(String(req.query.limit ?? '500'), 10);
        const parsedOffset = Number.parseInt(String(req.query.offset ?? '0'), 10);
        const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 5000) : 500;
        const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

        const result = await pool.query(
            `SELECT hg.*, ds.numero_serie, ds.modelo,
                    COALESCE(ds.es_simulado, hg.origen = 'SIMULADOR') AS es_simulado
             FROM historial_glucosa hg
             LEFT JOIN dispositivo_sensor ds ON ds.sensor_id = hg.sensor_id
             WHERE hg.paciente_id = $1
               AND ($2::TIMESTAMPTZ IS NULL OR hg.fecha_hora >= $2)
               AND ($3::TIMESTAMPTZ IS NULL OR hg.fecha_hora <= $3)
             ORDER BY hg.fecha_hora DESC
             LIMIT $4 OFFSET $5`,
            [patientId, startDate?.toISOString() ?? null, endDate?.toISOString() ?? null, limit, offset]
        );
        return res.status(200).json(result.rows.map(serializeReading));
    } catch (error: any) {
        return res.status(500).json({ error: 'Error obteniendo el historial', details: error.message });
    }
};

export const getLecturaActual = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = String(req.params.id);
        if (!await canAccessPatient(patientId, req.user)) {
            return res.status(403).json({ message: 'No tienes acceso a este paciente' });
        }

        const result = await pool.query(
            `SELECT hg.*, ds.numero_serie, ds.modelo,
                    COALESCE(ds.es_simulado, hg.origen = 'SIMULADOR') AS es_simulado
             FROM historial_glucosa hg
             LEFT JOIN dispositivo_sensor ds ON ds.sensor_id = hg.sensor_id
             WHERE hg.paciente_id = $1
             ORDER BY hg.fecha_hora DESC, hg.fecha_registro DESC
             LIMIT 1`,
            [patientId]
        );
        return res.status(200).json({
            medicion: result.rows[0] ? serializeReading(result.rows[0]) : null
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Error obteniendo la glucosa actual', details: error.message });
    }
};

export const updateLectura = async (req: AuthRequest, res: Response) => {
    try {
        const readingId = String(req.params.id);
        if (!UUID_PATTERN.test(readingId)) {
            return res.status(400).json({ message: 'El identificador de la lectura no es valido' });
        }

        const currentResult = await pool.query(
            `SELECT lectura_id, paciente_id
             FROM historial_glucosa hg
             WHERE hg.lectura_id = $1`,
            [readingId]
        );
        if (currentResult.rowCount === 0) {
            return res.status(404).json({ message: 'Lectura no encontrada' });
        }
        if (!await canAccessPatient(currentResult.rows[0].paciente_id, req.user)) {
            return res.status(403).json({ message: 'No tienes acceso a este paciente' });
        }

        const hasGlucose = req.body.valor_mgdl !== undefined;
        const hasDate = req.body.fecha_hora !== undefined;
        if (!hasGlucose && !hasDate) {
            return res.status(400).json({ message: 'Envia valor_mgdl o fecha_hora para corregir la lectura' });
        }

        const glucose = hasGlucose ? Number(req.body.valor_mgdl) : null;
        if (hasGlucose && (!Number.isFinite(glucose) || glucose! < MIN_GLUCOSE || glucose! > MAX_GLUCOSE)) {
            return res.status(400).json({
                message: `valor_mgdl debe estar entre ${MIN_GLUCOSE} y ${MAX_GLUCOSE}`
            });
        }
        const measuredAt = hasDate ? parseDate(req.body.fecha_hora) : null;
        if (hasDate && !measuredAt) {
            return res.status(400).json({ message: 'fecha_hora no es valida' });
        }
        if (measuredAt && measuredAt.getTime() > Date.now() + 5 * 60 * 1000) {
            return res.status(400).json({ message: 'fecha_hora no puede estar en el futuro' });
        }

        const updated = await pool.query(
            `UPDATE historial_glucosa
             SET valor_mgdl = CASE WHEN $2::BOOLEAN THEN $3 ELSE valor_mgdl END,
                 fecha_hora = CASE WHEN $4::BOOLEAN THEN $5 ELSE fecha_hora END
             WHERE lectura_id = $1
             RETURNING *, $6::VARCHAR AS paciente_id`,
            [
                readingId,
                hasGlucose,
                glucose,
                hasDate,
                measuredAt?.toISOString() ?? null,
                currentResult.rows[0].paciente_id
            ]
        );
        return res.status(200).json(serializeReading(updated.rows[0]));
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Ya existe una lectura del sensor para esa fecha y hora' });
        }
        return res.status(500).json({ error: 'Error actualizando la lectura', details: error.message });
    }
};

export const getGraficas = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = String(req.query.paciente_id ?? '').trim();
        if (!patientId) {
            return res.status(400).json({ message: 'Se requiere paciente_id para generar el reporte' });
        }
        if (!await canAccessPatient(patientId, req.user)) {
            return res.status(403).json({ message: 'No tienes acceso a este paciente' });
        }

        const startDate = req.query.startDate ? parseDate(req.query.startDate) : null;
        const endDate = req.query.endDate ? parseDate(req.query.endDate, true) : null;
        if ((req.query.startDate && !startDate) || (req.query.endDate && !endDate)) {
            return res.status(400).json({ message: 'El rango de fechas no es valido' });
        }

        const result = await pool.query(
            `SELECT AVG(hg.valor_mgdl) AS promedio,
                    MAX(hg.valor_mgdl) AS maximo,
                    MIN(hg.valor_mgdl) AS minimo,
                    COUNT(*)::INT AS total_lecturas
             FROM historial_glucosa hg
             WHERE hg.paciente_id = $1
               AND ($2::TIMESTAMPTZ IS NULL OR hg.fecha_hora >= $2)
               AND ($3::TIMESTAMPTZ IS NULL OR hg.fecha_hora <= $3)`,
            [patientId, startDate?.toISOString() ?? null, endDate?.toISOString() ?? null]
        );

        const row = result.rows[0];
        return res.status(200).json({
            _id: patientId,
            promedio: row.promedio === null ? 0 : Number(row.promedio),
            maximo: row.maximo === null ? 0 : Number(row.maximo),
            minimo: row.minimo === null ? 0 : Number(row.minimo),
            total_lecturas: Number(row.total_lecturas)
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Error generando estadisticas', details: error.message });
    }
};
