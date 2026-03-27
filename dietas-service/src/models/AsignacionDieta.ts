import mongoose, { Schema, Document } from 'mongoose';

export interface IAsignacionDieta extends Document {
  paciente_id: string; // FK Postgres
  medico_id: string; // Nueva FK para filtrar
  dieta_id: mongoose.Types.ObjectId; // Reference to CatalogoDieta
  fecha_asignacion: Date;
}

const AsignacionDietaSchema: Schema = new Schema({
  paciente_id: { type: String, required: true },
  medico_id: { type: String, required: true }, // Nueva FK
  dieta_id: { type: Schema.Types.ObjectId, ref: 'Catalogo_Dietas', required: true },
  fecha_asignacion: { type: Date, required: true }
}, { timestamps: true });

export const AsignacionDieta = mongoose.model<IAsignacionDieta>('Asignacion_Dietas', AsignacionDietaSchema);
