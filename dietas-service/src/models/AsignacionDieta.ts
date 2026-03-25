import mongoose, { Schema, Document } from 'mongoose';

export interface IAsignacionDieta extends Document {
  paciente_id: number; // FK Postgres
  dieta_id: mongoose.Types.ObjectId; // Reference to CatalogoDieta
  fecha_asignacion: Date;
}

const AsignacionDietaSchema: Schema = new Schema({
  paciente_id: { type: Number, required: true },
  dieta_id: { type: Schema.Types.ObjectId, ref: 'Catalogo_Dietas', required: true },
  fecha_asignacion: { type: Date, required: true }
}, { timestamps: true });

export const AsignacionDieta = mongoose.model<IAsignacionDieta>('Asignacion_Dietas', AsignacionDietaSchema);
