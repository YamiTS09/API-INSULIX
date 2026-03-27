import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
    createDietaCatalogo,
    getDietasCatalogo,
    updateDietaCatalogo,
    deleteDietaCatalogo,
    createAsignacionDieta,
    getAsignacionesDieta,
    updateAsignacionDieta,
    deleteAsignacionDieta,
    deleteAsignacionesByPaciente
} from '../controllers/dietas.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Catálogo de Dietas
 *     description: Gestión de platillos genéricos
 *   - name: Asignación de Dietas
 *     description: Asignación de dietas a pacientes
 */

// ======================= Catálogo =======================

/**
 * @swagger
 * /dietas/catalogo:
 *   post:
 *     summary: Crear nueva dieta en el catálogo
 *     description: Agrega un platillo base a la colección.
 *     tags: [Catálogo de Dietas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_platillo:
 *                 type: string
 *               categoria:
 *                 type: string
 *                 enum: [Desayuno, Comida, Cena, Colación]
 *               platillo:
 *                 type: string
 *               bebida:
 *                 type: string
 *     responses:
 *       201:
 *         description: Dieta creada en el catálogo
 *   get:
 *     summary: Obtener todas las dietas del catálogo
 *     tags: [Catálogo de Dietas]
 *     responses:
 *       200:
 *         description: Lista de dietas
 */
router.post('/catalogo', authenticateToken, createDietaCatalogo);
router.get('/catalogo', authenticateToken, getDietasCatalogo);

/**
 * @swagger
 * /dietas/catalogo/{id}:
 *   put:
 *     summary: Actualizar dieta del catálogo
 *     tags: [Catálogo de Dietas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de Mongo de la dieta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre_platillo:
 *                 type: string
 *               categoria:
 *                 type: string
 *                 enum: [Desayuno, Comida, Cena, Colación]
 *               platillo:
 *                 type: string
 *               bebida:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dieta actualizada
 *   delete:
 *     summary: Eliminar dieta del catálogo
 *     tags: [Catálogo de Dietas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de Mongo de la dieta
 *     responses:
 *       200:
 *         description: Dieta eliminada
 */
router.put('/catalogo/:id', authenticateToken, updateDietaCatalogo);
router.delete('/catalogo/:id', authenticateToken, deleteDietaCatalogo);


// ======================= Asignaciones =======================

/**
 * @swagger
 * /dietas/asignaciones:
 *   post:
 *     summary: Asignar dieta a paciente
 *     description: Vincula un platillo del catálogo a un paciente.
 *     tags: [Asignación de Dietas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paciente_id:
 *                 type: integer
 *               dieta_id:
 *                 type: string
 *                 description: ID de Mongo del platillo en el catálogo
 *               fecha_asignacion:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Asignación creada
 *   get:
 *     summary: Obtener asignaciones de dietas
 *     tags: [Asignación de Dietas]
 *     parameters:
 *       - in: query
 *         name: paciente_id
 *         schema:
 *           type: integer
 *         description: Filtrar por paciente
 *     responses:
 *       200:
 *         description: Lista de asignaciones
 */
router.post('/asignaciones', authenticateToken, createAsignacionDieta);
router.get('/asignaciones', authenticateToken, getAsignacionesDieta);

/**
 * @swagger
 * /dietas/asignaciones/{id}:
 *   put:
 *     summary: Actualizar asignación de dieta
 *     tags: [Asignación de Dietas]
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
 *               fecha_asignacion:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Asignación actualizada
 *   delete:
 *     summary: Eliminar asignación de dieta
 *     tags: [Asignación de Dietas]
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
router.put('/asignaciones/:id', authenticateToken, updateAsignacionDieta);
router.delete('/asignaciones/:id', authenticateToken, deleteAsignacionDieta);
router.delete('/asignaciones/paciente/:pacienteId', authenticateToken, deleteAsignacionesByPaciente);

export default router;
