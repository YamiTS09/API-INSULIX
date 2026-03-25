import { Request, Response } from 'express';
import { CatalogoActividad } from '../models/CatalogoActividad';
import { AsignacionActividad } from '../models/AsignacionActividad';

// --- Catálogo de Actividades ---

export const createActividadCatalogo = async (req: Request, res: Response) => {
    try {
        const nuevaActividad = new CatalogoActividad(req.body);
        const saved = await nuevaActividad.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Error agregando actividad al catálogo', details: error });
    }
};

export const getActividadesCatalogo = async (req: Request, res: Response) => {
    try {
        const actividades = await CatalogoActividad.find();
        res.status(200).json(actividades);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo catálogo de actividades' });
    }
};

export const updateActividadCatalogo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const actualizada = await CatalogoActividad.findByIdAndUpdate(id, req.body, { new: true });
        
        if (!actualizada) return res.status(404).json({ message: 'Actividad no encontrada' });
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando actividad en el catálogo', details: error });
    }
};

export const deleteActividadCatalogo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const eliminada = await CatalogoActividad.findByIdAndDelete(id);
        
        if (!eliminada) return res.status(404).json({ message: 'Actividad no encontrada' });
        res.status(200).json({ message: 'Actividad eliminada del catálogo correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando actividad del catálogo' });
    }
};

// --- Asignaciones de Actividades ---

export const createAsignacionActividad = async (req: Request, res: Response) => {
    try {
        const nuevaAsignacion = new AsignacionActividad(req.body);
        const saved = await nuevaAsignacion.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Error asignando actividad a paciente', details: error });
    }
};

export const getAsignacionesActividad = async (req: Request, res: Response) => {
    try {
        const { paciente_id } = req.query;
        let query = {};
        if (paciente_id) query = { paciente_id: Number(paciente_id) };

        const asignaciones = await AsignacionActividad.find(query).populate('actividad_id');
        res.status(200).json(asignaciones);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo asignaciones de actividades' });
    }
};

export const updateAsignacionActividad = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const actualizada = await AsignacionActividad.findByIdAndUpdate(id, req.body, { new: true }).populate('actividad_id');
        
        if (!actualizada) return res.status(404).json({ message: 'Asignación no encontrada' });
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando asignación', details: error });
    }
};

export const deleteAsignacionActividad = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const eliminada = await AsignacionActividad.findByIdAndDelete(id);
        
        if (!eliminada) return res.status(404).json({ message: 'Asignación no encontrada' });
        res.status(200).json({ message: 'Asignación eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando asignación' });
    }
};
