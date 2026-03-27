import { Request, Response } from 'express';
import { CatalogoDieta } from '../models/CatalogoDieta';
import { AsignacionDieta } from '../models/AsignacionDieta';

// Interfaz extendida localmente para evitar problemas de importación de tipos
interface AuthRequest extends Request {
    user?: any;
}

// --- Catálogo de Dietas ---

export const createDietaCatalogo = async (req: AuthRequest, res: Response) => {
    try {
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No se pudo identificar al médico (falta UID en token)' });

        const nuevaDieta = new CatalogoDieta({
            ...req.body,
            medico_id
        });
        const saved = await nuevaDieta.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Error agregando dieta al catálogo', details: error });
    }
};

export const getDietasCatalogo = async (req: AuthRequest, res: Response) => {
    try {
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No se pudo identificar al médico' });

        const dietas = await CatalogoDieta.find({ medico_id });
        res.status(200).json(dietas);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo catálogo de dietas' });
    }
};

export const updateDietaCatalogo = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado' });

        const actualizada = await CatalogoDieta.findOneAndUpdate(
            { _id: id, medico_id }, 
            req.body, 
            { new: true }
        );
        
        if (!actualizada) return res.status(404).json({ message: 'Dieta no encontrada o no tienes permiso' });
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando dieta en el catálogo', details: error });
    }
};

export const deleteDietaCatalogo = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado' });

        const eliminada = await CatalogoDieta.findOneAndDelete({ _id: id, medico_id });
        
        if (!eliminada) return res.status(404).json({ message: 'Dieta no encontrada o no tienes permiso' });
        res.status(200).json({ message: 'Dieta eliminada del catálogo correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando dieta del catálogo' });
    }
};

// --- Asignaciones de Dietas ---

export const createAsignacionDieta = async (req: AuthRequest, res: Response) => {
    try {
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No se pudo identificar al médico' });

        const nuevaAsignacion = new AsignacionDieta({
            ...req.body,
            medico_id
        });
        const saved = await nuevaAsignacion.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Error asignando dieta a paciente', details: error });
    }
};

export const getAsignacionesDieta = async (req: AuthRequest, res: Response) => {
    try {
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No se pudo identificar al médico' });

        const { paciente_id } = req.query;
        let query: any = { medico_id };
        if (paciente_id) query.paciente_id = paciente_id as string;

        const asignaciones = await AsignacionDieta.find(query).populate('dieta_id');
        res.status(200).json(asignaciones);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo asignaciones de dietas' });
    }
};

export const updateAsignacionDieta = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado' });

        const actualizada = await AsignacionDieta.findOneAndUpdate(
            { _id: id, medico_id }, 
            req.body, 
            { new: true }
        ).populate('dieta_id');
        
        if (!actualizada) return res.status(404).json({ message: 'Asignación no encontrada o no tienes permiso' });
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando asignación', details: error });
    }
};

export const deleteAsignacionDieta = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado' });

        const eliminada = await AsignacionDieta.findOneAndDelete({ _id: id, medico_id });
        
        if (!eliminada) return res.status(404).json({ message: 'Asignación no encontrada o no tienes permiso' });
        res.status(200).json({ message: 'Asignación eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando asignación' });
    }
};

// Nueva función para eliminación en cascada (llamada por users-service)
export const deleteAsignacionesByPaciente = async (req: AuthRequest, res: Response) => {
    try {
        const { pacienteId } = req.params;
        const medico_id = req.user?.uid;
        if (!medico_id) return res.status(401).json({ error: 'No autorizado' });

        const result = await AsignacionDieta.deleteMany({ paciente_id: pacienteId, medico_id });
        res.status(200).json({ message: `Se eliminaron ${result.deletedCount} asignaciones de dieta`, deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando asignaciones por paciente', details: error });
    }
};
