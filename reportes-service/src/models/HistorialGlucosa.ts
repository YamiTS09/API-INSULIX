import mongoose, { Schema, Document } from 'mongoose';

export interface IHistorialGlucosa extends Document {
  paciente_id: number; // FK Postgres
  valor_mgdl: number; // Norma ISO 80000-9
  fecha_hora: Date; // Formato ISO 8601
}

const HistorialGlucosaSchema: Schema = new Schema({
  paciente_id: { type: Number, required: true },
  valor_mgdl: { type: Number, required: true },
  fecha_hora: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

export const HistorialGlucosa = mongoose.model<IHistorialGlucosa>('Historial_Glucosa', HistorialGlucosaSchema);
