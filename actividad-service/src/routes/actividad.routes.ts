import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
    createActividadCatalogo,
    getActividadesCatalogo,
    updateActividadCatalogo,
    deleteActividadCatalogo,
    createAsignacionActividad,
    getAsignacionesActividad,
    updateAsignacionActividad,
    deleteAsignacionActividad
} from '../controllers/actividad.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Catálogo de Actividades
 *     description: Gestión de ejercicios genéricos
 *   - name: Asignación de Actividades
 *     description: Asignación de rutinas a pacientes
 */

// ======================= Catálogo =======================

/**
 * @swagger
 * /actividad/catalogo:
 *   post:
 *     summary: Crear nuevo ejercicio en el catálogo
 *     description: Agrega un ejercicio base a la colección.
 *     tags: [Catálogo de Actividades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_ejercicio:
 *                 type: string
 *               duracion_min:
 *                 type: integer
 *               intensidad:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ejercicio creado en el catálogo
 *   get:
 *     summary: Obtener todos los ejercicios del catálogo
 *     tags: [Catálogo de Actividades]
 *     responses:
 *       200:
 *         description: Lista de ejercicios
 */
router.post('/catalogo', authenticateToken, createActividadCatalogo);
router.get('/catalogo', authenticateToken, getActividadesCatalogo);

/**
 * @swagger
 * /actividad/catalogo/{id}:
 *   put:
 *     summary: Actualizar ejercicio del catálogo
 *     tags: [Catálogo de Actividades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de Mongo del ejercicio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_ejercicio:
 *                 type: string
 *               duracion_min:
 *                 type: integer
 *               intensidad:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ejercicio actualizado
 *   delete:
 *     summary: Eliminar ejercicio del catálogo
 *     tags: [Catálogo de Actividades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de Mongo del ejercicio
 *     responses:
 *       200:
 *         description: Ejercicio eliminado
 */
router.put('/catalogo/:id', authenticateToken, updateActividadCatalogo);
router.delete('/catalogo/:id', authenticateToken, deleteActividadCatalogo);


// ======================= Asignaciones =======================

/**
 * @swagger
 * /actividad/asignaciones:
 *   post:
 *     summary: Asignar rutina a paciente
 *     description: Vincula un ejercicio del catálogo a un paciente.
 *     tags: [Asignación de Actividades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paciente_id:
 *                 type: integer
 *               actividad_id:
 *                 type: string
 *                 description: ID de Mongo del ejercicio en el catálogo
 *               notas_medicas:
 *                 type: string
 *               fecha:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Asignación creada
 *   get:
 *     summary: Obtener rutinas de pacientes
 *     tags: [Asignación de Actividades]
 *     parameters:
 *       - in: query
 *         name: paciente_id
 *         schema:
 *           type: integer
 *         description: Filtrar por paciente
 *     responses:
 *       200:
 *         description: Lista de rutinas
 */
router.post('/asignaciones', authenticateToken, createAsignacionActividad);
router.get('/asignaciones', authenticateToken, getAsignacionesActividad);

/**
 * @swagger
 * /actividad/asignaciones/{id}:
 *   put:
 *     summary: Actualizar rutina de actividad física
 *     tags: [Asignación de Actividades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de Mongo de la asignación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notas_medicas:
 *                 type: string
 *               fecha:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Asignación actualizada
 *   delete:
 *     summary: Eliminar rutina de actividad física
 *     tags: [Asignación de Actividades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de Mongo de la asignación
 *     responses:
 *       200:
 *         description: Asignación eliminada
 */
router.put('/asignaciones/:id', authenticateToken, updateAsignacionActividad);
router.delete('/asignaciones/:id', authenticateToken, deleteAsignacionActividad);

export default router;
