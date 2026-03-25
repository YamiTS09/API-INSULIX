import mongoose, { Schema, Document } from 'mongoose';

export interface ICatalogoDieta extends Document {
  nombre_platillo: string;
  categoria: 'Desayuno' | 'Comida' | 'Cena' | 'Colación';
  platillo: string;
  bebida: string;
}

const CatalogoDietaSchema: Schema = new Schema({
  nombre_platillo: { type: String, required: true },
  categoria: { type: String, enum: ['Desayuno', 'Comida', 'Cena', 'Colación'], required: true },
  platillo: { type: String, required: true },
  bebida: { type: String, required: true }
}, { timestamps: true });

export const CatalogoDieta = mongoose.model<ICatalogoDieta>('Catalogo_Dietas', CatalogoDietaSchema);
