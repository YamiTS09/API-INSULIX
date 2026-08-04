import { Router } from 'express';
import {
    agregarLectura,
    agregarLecturaSimulada,
    getGraficas,
    getHistorialPaciente,
    getLecturaActual,
    listarSensores,
    registrarSensor,
    updateLectura
} from '../controllers/reportes.controller';
import { authenticateJWT, requireRole } from '../middlewares/jwt.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Sensores
 *     description: Sensores reales o simulados asignados a pacientes
 *   - name: Glucosa
 *     description: Historial continuo de mediciones de glucosa
 */

router.use(authenticateJWT);

/**
 * @swagger
 * /reportes/sensores:
 *   post:
 *     summary: Registrar un sensor para un paciente
 *     tags: [Sensores]
 */
router.post('/sensores', requireRole(['MEDICO', 'ADMIN']), registrarSensor);

/**
 * @swagger
 * /reportes/sensores/{pacienteId}:
 *   get:
 *     summary: Listar los sensores de un paciente
 *     tags: [Sensores]
 */
router.get(
    '/sensores/:pacienteId',
    requireRole(['MEDICO', 'PACIENTE', 'ADMIN']),
    listarSensores
);

/**
 * @swagger
 * /reportes/glucosa:
 *   post:
 *     summary: Registrar una medicion de glucosa
 *     tags: [Glucosa]
 */
router.post(
    '/glucosa',
    requireRole(['MEDICO', 'PACIENTE', 'ADMIN']),
    agregarLectura
);

/**
 * @swagger
 * /reportes/glucosa/simulada:
 *   post:
 *     summary: Simular y guardar una medicion para el paciente autenticado
 *     description: Crea o reutiliza un sensor simulado y registra 108 mg/dL con origen SIMULADOR.
 *     tags: [Glucosa]
 *     responses:
 *       201:
 *         description: Lectura simulada guardada
 */
router.post(
    '/glucosa/simulada',
    requireRole(['PACIENTE']),
    agregarLecturaSimulada
);

/**
 * @swagger
 * /reportes/glucosa/{id}/actual:
 *   get:
 *     summary: Obtener la medicion mas reciente de un paciente
 *     tags: [Glucosa]
 */
router.get(
    '/glucosa/:id/actual',
    requireRole(['MEDICO', 'PACIENTE', 'ADMIN']),
    getLecturaActual
);

/**
 * @swagger
 * /reportes/glucosa/{id}:
 *   get:
 *     summary: Obtener el historial de un paciente
 *     tags: [Glucosa]
 *   put:
 *     summary: Corregir una medicion existente
 *     tags: [Glucosa]
 */
router.get(
    '/glucosa/:id',
    requireRole(['MEDICO', 'PACIENTE', 'ADMIN']),
    getHistorialPaciente
);
router.put(
    '/glucosa/:id',
    requireRole(['MEDICO', 'ADMIN']),
    updateLectura
);

/**
 * @swagger
 * /reportes/graficas:
 *   get:
 *     summary: Calcular promedio, minimo, maximo y total de lecturas
 *     tags: [Glucosa]
 */
router.get(
    '/graficas',
    requireRole(['MEDICO', 'PACIENTE', 'ADMIN']),
    getGraficas
);

export default router;
