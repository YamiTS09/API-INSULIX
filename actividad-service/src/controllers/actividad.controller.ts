import { Request, Response } from 'express';
import { CatalogoActividad } from '../models/CatalogoActividad';
import { AsignacionActividad } from '../models/AsignacionActividad';

// Interfaz extendida localmente para manejar el usuario del JWT
interface AuthRequest extends Request {
    user?: any;
}

// --- Catálogo de Actividades ---

export const createActividadCatalogo = async (req: AuthRequest, res: Response) => {
    try {
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado: Falta UID del médico' });

        const nuevaActividad = new CatalogoActividad({
            ...req.body,
            medico_id
        });
        const saved = await nuevaActividad.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Error agregando actividad al catálogo', details: error });
    }
};

export const getActividadesCatalogo = async (req: AuthRequest, res: Response) => {
    try {
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado' });

        const actividades = await CatalogoActividad.find({ medico_id });
        res.status(200).json(actividades);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo catálogo de actividades' });
    }
};

export const updateActividadCatalogo = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado' });

        const actualizada = await CatalogoActividad.findOneAndUpdate(
            { _id: id, medico_id },
            req.body,
            { new: true }
        );
        
        if (!actualizada) return res.status(404).json({ message: 'Actividad no encontrada o no tienes permiso' });
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando actividad en el catálogo', details: error });
    }
};

export const deleteActividadCatalogo = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado' });

        const eliminada = await CatalogoActividad.findOneAndDelete({ _id: id, medico_id });
        
        if (!eliminada) return res.status(404).json({ message: 'Actividad no encontrada o no tienes permiso' });
        res.status(200).json({ message: 'Actividad eliminada del catálogo correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando actividad del catálogo' });
    }
};

// --- Asignaciones de Actividades ---

export const createAsignacionActividad = async (req: AuthRequest, res: Response) => {
    try {
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado' });

        const nuevaAsignacion = new AsignacionActividad({
            ...req.body,
            medico_id
        });
        const saved = await nuevaAsignacion.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Error asignando actividad a paciente', details: error });
    }
};

export const getAsignacionesActividad = async (req: AuthRequest, res: Response) => {
    try {
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado' });

        const { paciente_id } = req.query;
        let query: any = { medico_id };
        if (paciente_id) query.paciente_id = paciente_id as string;

        const asignaciones = await AsignacionActividad.find(query).populate('actividad_id');
        res.status(200).json(asignaciones);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo asignaciones de actividades' });
    }
};

export const updateAsignacionActividad = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado' });

        const actualizada = await AsignacionActividad.findOneAndUpdate(
            { _id: id, medico_id },
            req.body,
            { new: true }
        ).populate('actividad_id');
        
        if (!actualizada) return res.status(404).json({ message: 'Asignación no encontrada o no tienes permiso' });
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando asignación', details: error });
    }
};

export const deleteAsignacionActividad = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado' });

        const eliminada = await AsignacionActividad.findOneAndDelete({ _id: id, medico_id });
        
        if (!eliminada) return res.status(404).json({ message: 'Asignación no encontrada o no tienes permiso' });
        res.status(200).json({ message: 'Asignación eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando asignación' });
    }
};
