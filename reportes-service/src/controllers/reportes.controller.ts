import { Request, Response } from 'express';
import { HistorialGlucosa } from '../models/HistorialGlucosa';

// Agregar lectura de glucosa
export const agregarLectura = async (req: Request, res: Response) => {
    try {
        const nuevaLectura = new HistorialGlucosa(req.body);
        const saved = await nuevaLectura.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Error agregando lectura de glucosa', details: error });
    }
};

// Obtener historial con filtros de fecha
export const getHistorialPaciente = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // paciente_id
        const { startDate, endDate } = req.query;
        
        // Tipamos la consulta para evitar el 'any'
        const query: Record<string, any> = { paciente_id: Number(id) };

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

// Actualizar una lectura específica (ObjectId)
export const updateLectura = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const actualizada = await HistorialGlucosa.findByIdAndUpdate(id, req.body, { new: true });
        
        if (!actualizada) return res.status(404).json({ message: 'Lectura no encontrada' });
        res.status(200).json(actualizada);
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando lectura', details: error });
    }
};

// Generar estadísticas (Reporte Agregado)
export const getGraficas = async (req: Request, res: Response) => {
    try {
         const { paciente_id } = req.query;
         
         if (!paciente_id) {
             return res.status(400).json({ message: 'Se requiere paciente_id para generar reporte' });
         }

         // Agregación de MongoDB para estadísticas rápidas
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

         // Si no hay datos, devolvemos un objeto vacío estructurado en lugar de un error
         res.status(200).json(stats[0] || { 
            _id: paciente_id, 
            promedio: 0, 
            maximo: 0, 
            minimo: 0, 
            total_lecturas: 0 
         });
    } catch (error) {
         res.status(500).json({ error: 'Error generando estadísticas' });
    }
};