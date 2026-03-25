import mongoose, { Schema, Document } from 'mongoose';

export interface ICatalogoActividad extends Document {
  nombre_ejercicio: string;
  duracion_min: number;
  intensidad: string;
}

const CatalogoActividadSchema: Schema = new Schema({
  nombre_ejercicio: { type: String, required: true },
  duracion_min: { type: Number, required: true },
  intensidad: { type: String, required: true }
}, { timestamps: true });

export const CatalogoActividad = mongoose.model<ICatalogoActividad>('Catalogo_Actividades', CatalogoActividadSchema);
