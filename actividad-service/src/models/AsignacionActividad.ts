import mongoose, { Schema, Document } from 'mongoose';

export interface IAsignacionActividad extends Document {
  paciente_id: number; // FK Postgres
  actividad_id: mongoose.Types.ObjectId; // Reference to CatalogoActividad
  notas_medicas: string;
  fecha: Date;
}

const AsignacionActividadSchema: Schema = new Schema({
  paciente_id: { type: Number, required: true },
  actividad_id: { type: Schema.Types.ObjectId, ref: 'Catalogo_Actividades', required: true },
  notas_medicas: { type: String },
  fecha: { type: Date, required: true }
}, { timestamps: true });

export const AsignacionActividad = mongoose.model<IAsignacionActividad>('Asignacion_Actividades', AsignacionActividadSchema);
