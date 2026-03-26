import { Request, Response } from 'express';
import { CatalogoDieta } from '../models/CatalogoDieta';
import { AsignacionDieta } from '../models/AsignacionDieta';

// --- Catálogo de Dietas ---

export const createDietaCatalogo = async (req: Request, res: Response) => {
    try {
        const nuevaDieta = new CatalogoDieta(req.body);
        const saved = await nuevaDieta.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Error agregando dieta al catálogo', details: error });
    }
};

export const getDietasCatalogo = async (req: Request, res: Response) => {
    try {
        const dietas = await CatalogoDieta.find();
        res.status(200).json(dietas);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo catálogo de dietas' });
    }
};

export const updateDietaCatalogo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const actualizada = await CatalogoDieta.findByIdAndUpdate(id, req.body, { new: true });
        
        if (!actualizada) return res.status(404).json({ message: 'Dieta no encontrada' });
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando dieta en el catálogo', details: error });
    }
};

export const deleteDietaCatalogo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const eliminada = await CatalogoDieta.findByIdAndDelete(id);
        
        if (!eliminada) return res.status(404).json({ message: 'Dieta no encontrada' });
        res.status(200).json({ message: 'Dieta eliminada del catálogo correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando dieta del catálogo' });
    }
};

// --- Asignaciones de Dietas ---

export const createAsignacionDieta = async (req: Request, res: Response) => {
    try {
        const nuevaAsignacion = new AsignacionDieta(req.body);
        const saved = await nuevaAsignacion.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Error asignando dieta a paciente', details: error });
    }
};

export const getAsignacionesDieta = async (req: Request, res: Response) => {
    try {
        const { paciente_id } = req.query;
        let query = {};
        if (paciente_id) query = { paciente_id: paciente_id as string };

        const asignaciones = await AsignacionDieta.find(query).populate('dieta_id');
        res.status(200).json(asignaciones);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo asignaciones de dietas' });
    }
};

export const updateAsignacionDieta = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const actualizada = await AsignacionDieta.findByIdAndUpdate(id, req.body, { new: true }).populate('dieta_id');
        
        if (!actualizada) return res.status(404).json({ message: 'Asignación no encontrada' });
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando asignación', details: error });
    }
};

export const deleteAsignacionDieta = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const eliminada = await AsignacionDieta.findByIdAndDelete(id);
        
        if (!eliminada) return res.status(404).json({ message: 'Asignación no encontrada' });
        res.status(200).json({ message: 'Asignación eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando asignación' });
    }
};
