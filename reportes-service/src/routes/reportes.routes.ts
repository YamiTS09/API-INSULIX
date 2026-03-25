import { Router } from 'express';
import {
    agregarLectura,
    getHistorialPaciente,
    updateLectura,
    getGraficas
} from '../controllers/reportes.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Historial de Glucosa
 *     description: Reportes de niveles y lectura
 */

/**
 * @swagger
 * /reportes/glucosa:
 *   post:
 *     summary: Subir medición de glucosa
 *     description: Añade un nuevo registro al historial.
 *     tags: [Historial de Glucosa]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paciente_id:
 *                 type: integer
 *               valor_mgdl:
 *                 type: number
 *               fecha_hora:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Historial creado exitosamente
 */
router.post('/glucosa', agregarLectura);

/**
 * @swagger
 * /reportes/glucosa/{id}:
 *   get:
 *     summary: Ver historial de un paciente
 *     description: Lista las mediciones de un paciente.
 *     tags: [Historial de Glucosa]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del paciente (PostgreSQL ID)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Historial obtenido
 *   put:
 *     summary: Corregir una medición errónea
 *     description: Modifica los valores de una lectura.
 *     tags: [Historial de Glucosa]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId de la lectura
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               valor_mgdl:
 *                 type: number
 *               fecha_hora:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Lectura actualizada
 */
router.get('/glucosa/:id', getHistorialPaciente);
router.put('/glucosa/:id', updateLectura);

/**
 * @swagger
 * /reportes/graficas:
 *   get:
 *     summary: Generar datos estadísticos básicos (min, max, avg)
 *     description: Estadísticas para graficar glucosa ISO 80000-9.
 *     tags: [Historial de Glucosa]
 *     parameters:
 *       - in: query
 *         name: paciente_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estadísticas calculadas
 */
router.get('/graficas', getGraficas);

export default router;
