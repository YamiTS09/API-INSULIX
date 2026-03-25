import { Request, Response } from 'express';
import { HistorialGlucosa } from '../models/HistorialGlucosa';

export const agregarLectura = async (req: Request, res: Response) => {
    try {
        const nuevaLectura = new HistorialGlucosa(req.body);
        const saved = await nuevaLectura.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Error agregando lectura de glucosa', details: error });
    }
};

export const getHistorialPaciente = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // paciente_id
        
        const { startDate, endDate } = req.query;
        let query: any = { paciente_id: Number(id) };

        if (startDate && endDate) {
            query.fecha_hora = { 
                $gte: new Date(startDate as string), 
                $lte: new Date(endDate as string) 
            };
        }

        const lecturas = await HistorialGlucosa.find(query).sort({ fecha_hora: -1 });
        res.status(200).json(lecturas);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo historial' });
    }
};

export const updateLectura = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // ID de la lectura (ObjectId)
        const actualizada = await HistorialGlucosa.findByIdAndUpdate(id, req.body, { new: true });
        
        if (!actualizada) return res.status(404).json({ message: 'Lectura no encontrada' });
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando lectura', details: error });
    }
};

export const getGraficas = async (req: Request, res: Response) => {
    try {
         const { paciente_id } = req.query;
         
         if (!paciente_id) {
             return res.status(400).json({ message: 'Se requiere paciente_id para generar reporte' });
         }

         const stats = await HistorialGlucosa.aggregate([
             { $match: { paciente_id: Number(paciente_id) } },
             {
                 $group: {
                     _id: "$paciente_id",
                     promedio: { $avg: "$valor_mgdl" },
                     maximo: { $max: "$valor_mgdl" },
                     minimo: { $min: "$valor_mgdl" },
                     total_lecturas: { $sum: 1 }
                 }
             }
         ]);

         res.status(200).json(stats[0] || { message: 'Sin datos para generar estadísticas' });
    } catch (error) {
         res.status(500).json({ error: 'Error generando estadísticas' });
    }
};
