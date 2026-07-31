import { Response } from 'express';
import { pool } from '../models/db';
import { AuthRequest } from '../middlewares/jwt.middleware';

type PesoOrigen = 'MEDICO' | 'PACIENTE';

const puedeAccederPaciente = async (pacienteId: string, usuario: any): Promise<boolean> => {
    if (!usuario?.uid || !usuario?.role) return false;
    if (usuario.role === 'ADMIN') return true;
    if (usuario.role === 'PACIENTE') {
        if (usuario.uid !== pacienteId) return false;
        const result = await pool.query(
            `SELECT 1
             FROM detalle_paciente p
             JOIN usuario u ON u.usuario_id = p.paciente_id
             WHERE p.paciente_id = $1 AND u.is_active = true`,
            [pacienteId]
        );
        return result.rowCount === 1;
    }

    if (usuario.role === 'MEDICO') {
        const result = await pool.query(
            `SELECT 1
             FROM detalle_paciente p
             JOIN usuario u ON u.usuario_id = p.paciente_id
             WHERE p.paciente_id = $1 AND p.medico_id = $2 AND u.is_active = true`,
            [pacienteId, usuario.uid]
        );
        return result.rowCount === 1;
    }

    return false;
};

const origenDesdeRol = (role: string): PesoOrigen | null => {
    if (role === 'MEDICO') return 'MEDICO';
    if (role === 'PACIENTE') return 'PACIENTE';
    return null;
};

export const registrarPeso = async (req: AuthRequest, res: Response) => {
    try {
        const pacienteId = String(req.params.id);
        const valor = Number(req.body.valor_kg);
        const origen = origenDesdeRol(req.user?.role);

        if (!origen) {
            return res.status(403).json({ message: 'Tu rol no puede registrar mediciones de peso' });
        }
        if (!Number.isFinite(valor) || valor < 30 || valor > 200) {
            return res.status(400).json({ message: 'El peso debe estar entre 30 y 200 kg' });
        }

        const fecha = req.body.fecha_medicion ? new Date(req.body.fecha_medicion) : new Date();
        if (Number.isNaN(fecha.getTime())) {
            return res.status(400).json({ message: 'La fecha de medición no es válida' });
        }
        if (fecha.getTime() > Date.now() + (5 * 60 * 1000)) {
            return res.status(400).json({ message: 'La fecha de medición no puede estar en el futuro' });
        }
        if (!await puedeAccederPaciente(pacienteId, req.user)) {
            return res.status(403).json({ message: 'No tienes acceso a este paciente' });
        }

        const result = await pool.query(
            `INSERT INTO historial_peso
             (paciente_id, valor_kg, fecha_medicion, registrado_por, origen)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [pacienteId, valor, fecha.toISOString(), req.user.uid, origen]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error: any) {
        return res.status(500).json({ error: 'Error registrando el peso', details: error.message });
    }
};

export const obtenerPesoActual = async (req: AuthRequest, res: Response) => {
    try {
        const pacienteId = String(req.params.id);
        if (!await puedeAccederPaciente(pacienteId, req.user)) {
            return res.status(403).json({ message: 'No tienes acceso a este paciente' });
        }

        const result = await pool.query(
            `SELECT hp.*, u.nombre AS registrado_por_nombre,
                    u.apellido_paterno AS registrado_por_apellido
             FROM historial_peso hp
             LEFT JOIN usuario u ON u.usuario_id = hp.registrado_por
             WHERE hp.paciente_id = $1
             ORDER BY hp.fecha_medicion DESC, hp.fecha_registro DESC
             LIMIT 1`,
            [pacienteId]
        );
        return res.status(200).json({ medicion: result.rows[0] ?? null });
    } catch (error: any) {
        return res.status(500).json({ error: 'Error obteniendo el peso actual', details: error.message });
    }
};

export const obtenerHistorialPeso = async (req: AuthRequest, res: Response) => {
    try {
        const pacienteId = String(req.params.id);
        const parsedLimit = Number.parseInt(String(req.query.limit ?? '50'), 10);
        const parsedOffset = Number.parseInt(String(req.query.offset ?? '0'), 10);
        const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
        const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

        if (!await puedeAccederPaciente(pacienteId, req.user)) {
            return res.status(403).json({ message: 'No tienes acceso a este paciente' });
        }

        const result = await pool.query(
            `SELECT hp.*, u.nombre AS registrado_por_nombre,
                    u.apellido_paterno AS registrado_por_apellido
             FROM historial_peso hp
             LEFT JOIN usuario u ON u.usuario_id = hp.registrado_por
             WHERE hp.paciente_id = $1
             ORDER BY hp.fecha_medicion DESC, hp.fecha_registro DESC
             LIMIT $2 OFFSET $3`,
            [pacienteId, limit, offset]
        );
        return res.status(200).json({ mediciones: result.rows, limit, offset });
    } catch (error: any) {
        return res.status(500).json({ error: 'Error obteniendo el historial de peso', details: error.message });
    }
};
