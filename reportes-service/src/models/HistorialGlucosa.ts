import mongoose, { Schema, Document, Model } from 'mongoose';

// Definimos la interfaz que representa el documento en la base de datos
export interface IHistorialGlucosa extends Document {
  paciente_id: number; // ID que viene de tu base de datos Postgres (Users)
  valor_mgdl: number;  // Valor de glucosa en sangre
  fecha_hora: Date;    // Fecha de la toma
}

// Definimos el esquema con tipos explícitos para mayor seguridad en el build
const HistorialGlucosaSchema: Schema<IHistorialGlucosa> = new Schema({
  paciente_id: { 
    type: Number, 
    required: [true, 'El ID del paciente es obligatorio'] 
  },
  valor_mgdl: { 
    type: Number, 
    required: [true, 'El valor de glucosa es obligatorio'] 
  },
  fecha_hora: { 
    type: Date, 
    required: true, 
    default: Date.now 
  }
}, { 
  timestamps: true, // Esto te crea automáticamente 'createdAt' y 'updatedAt'
  versionKey: false  // Esto quita el campo '__v' que a veces estorba en los reportes
});

// Exportamos el modelo
export const HistorialGlucosa: Model<IHistorialGlucosa> = mongoose.model<IHistorialGlucosa>('Historial_Glucosa', HistorialGlucosaSchema);