import mongoose, { Schema, Document } from 'mongoose';

export interface ICatalogoActividad extends Document {
  nombre_ejercicio: string;
  medico_id: string; // Nueva FK
  duracion_min: number;
  intensidad: string;
}

const CatalogoActividadSchema: Schema = new Schema({
  nombre_ejercicio: { type: String, required: true },
  medico_id: { type: String, required: true }, // Nueva FK
  duracion_min: { type: Number, required: true },
  intensidad: { type: String, required: true }
}, { timestamps: true });

export const CatalogoActividad = mongoose.model<ICatalogoActividad>('Catalogo_Actividades', CatalogoActividadSchema);
