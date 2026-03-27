import mongoose, { Schema, Document } from 'mongoose';

export interface IAsignacionActividad extends Document {
  paciente_id: string; // FK Postgres
  medico_id: string; // Nueva FK
  actividad_id: mongoose.Types.ObjectId; // Reference to CatalogoActividad
  notas_medicas: string;
  fecha: Date;
}

const AsignacionActividadSchema: Schema = new Schema({
  paciente_id: { type: String, required: true },
  medico_id: { type: String, required: true }, // Nueva FK
  actividad_id: { type: Schema.Types.ObjectId, ref: 'Catalogo_Actividades', required: true },
  notas_medicas: { type: String },
  fecha: { type: Date, required: true }
}, { timestamps: true });

export const AsignacionActividad = mongoose.model<IAsignacionActividad>('Asignacion_Actividades', AsignacionActividadSchema);
