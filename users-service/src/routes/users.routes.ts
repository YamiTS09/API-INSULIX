import { Router } from 'express';
import { upload } from '../services/cloudinary.service';
import {
    registerMedico,
    getMedicos,
    getMedicoById,
    updateMedico,
    createPaciente,
    getPacientes,
    getPacienteById,
    updatePaciente,
    deletePaciente
} from '../controllers/users.controller';
import { generateCode, verifyCode, generateRegistrationCode, verifyRegistrationCode } from '../controllers/2fa.controller';
import { checkLockoutStatus, logFailedAttempt, resetAttempts } from '../controllers/lockout.controller';
import { authenticateJWT, requireRole } from '../middlewares/jwt.middleware';

const router = Router();

/**
 * @swagger
 * /users/medico:
 *   post:
 *     summary: Registro de médicos
 *     description: Crea un Usuario y su información de detalle_medico en BD. Asume inicio de sesión en Firebase exitoso.
 *     tags: [Medicos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *                 description: ID generado por Firebase Auth
 *               email:
 *                 type: string
 *               nombre:
 *                 type: string
 *               apellido_paterno:
 *                 type: string
 *               apellido_materno:
 *                 type: string
 *               cedula_profesional:
 *                 type: string
 *               especialidad:
 *                 type: string
 *               hospital:
 *                 type: string
 *               telefono:
 *                 type: string
 *               foto_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Médico creado exitosamente en PostgreSQL
 *   get:
 *     summary: Lista de médicos
 *     description: Retorna la lista de todos los médicos activos en el sistema.
 *     tags: [Medicos]
 *     responses:
 *       200:
 *         description: Lista devuelta.
 */
router.post('/medico/signup', upload.single('foto'), registerMedico); // Ruta pública protegida por lógica interna
router.get('/medico', authenticateJWT, getMedicos);

/**
 * @swagger
 * /users/medico/{id}:
 *   get:
 *     summary: Perfil de médico
 *     description: Obtiene los detalles de un médico dado su Firebase UID.
 *     tags: [Medicos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UID de Firebase del Médico
 *     responses:
 *       200:
 *         description: Médico encontrado.
 *       404:
 *         description: Médico no encontrado.
 */
router.get('/medico/:id', authenticateJWT, getMedicoById);
router.put('/medico/:id', authenticateJWT, upload.single('foto'), updateMedico);

/**
 * @swagger
 * /users/paciente:
 *   post:
 *     summary: Alta de pacientes
 *     description: El médico registra a un paciente sumando su perfil a detalle_paciente y tabla usuario base.
 *     tags: [Pacientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *                 description: ID generado por Firebase Auth
 *               email:
 *                 type: string
 *               medico_id:
 *                 type: string
 *                 description: UID del Médico en Firebase
 *               nombre:
 *                 type: string
 *               apellido_paterno:
 *                 type: string
 *               apellido_materno:
 *                 type: string
 *               edad:
 *                 type: integer
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *               sexo:
 *                 type: string
 *                 enum: [M, F, Otro]
 *               tipo_diabetes:
 *                 type: string
 *                 enum: [Tipo 1, Tipo 2, Gestacional, Otro]
 *               glucosa_base:
 *                 type: number
 *               peso:
 *                 type: number
 *               estatura:
 *                 type: number
 *               telefono:
 *                 type: string
 *               direccion:
 *                 type: string
 *               foto_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Paciente creado
 *   get:
 *     summary: Lista de pacientes
 *     description: Lista todos los pacientes activos (opcionalmente filtrados por ?medico_id).
 *     tags: [Pacientes]
 *     parameters:
 *       - in: query
 *         name: medico_id
 *         schema:
 *           type: string
 *         description: UID del médico en Firebase para filtrar sus pacientes
 *     responses:
 *       200:
 *         description: Lista de pacientes obtenida
 */
router.post('/paciente', authenticateJWT, requireRole(['MEDICO']), upload.single('foto'), createPaciente);
router.get('/paciente', authenticateJWT, getPacientes);

/**
 * @swagger
 * /users/paciente/{id}:
 *   get:
 *     summary: Detalle de un paciente
 *     description: Obtiene la información de un paciente específico.
 *     tags: [Pacientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UID de Firebase del Paciente
 *     responses:
 *       200:
 *         description: Detalles del paciente
 *       404:
 *         description: Paciente no encontrado
 *   put:
 *     summary: Editar paciente
 *     description: Modifica los datos personales del paciente.
 *     tags: [Pacientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UID de Firebase del Paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               apellido_paterno:
 *                 type: string
 *               apellido_materno:
 *                 type: string
 *               edad:
 *                 type: integer
 *               fecha_nacimiento:
 *                 type: string
 *                 format: date
 *               sexo:
 *                 type: string
 *                 enum: [M, F, Otro]
 *               tipo_diabetes:
 *                 type: string
 *                 enum: [Tipo 1, Tipo 2, Gestacional, Otro]
 *               glucosa_base:
 *                 type: number
 *               peso:
 *                 type: number
 *               estatura:
 *                 type: number
 *               telefono:
 *                 type: string
 *               direccion:
 *                 type: string
 *               foto_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Paciente actualizado
 *       404:
 *         description: Paciente no encontrado
 *   delete:
 *     summary: Baja lógica de paciente
 *     description: Desactiva un paciente en la tabla 'usuario'.
 *     tags: [Pacientes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UID de Firebase del Paciente
 *     responses:
 *       200:
 *         description: Paciente desactivado
 *       404:
 *         description: Paciente no encontrado
 */
router.get('/paciente/:id', authenticateJWT, getPacienteById);
router.put('/paciente/:id', authenticateJWT, requireRole(['MEDICO']), upload.single('foto'), updatePaciente);
router.delete('/paciente/:id', authenticateJWT, requireRole(['MEDICO']), deletePaciente);

/**
 * @swagger
 * /users/2fa/generate:
 *   post:
 *     summary: Generar código 2FA
 *     tags: [Seguridad]
 */
router.post('/2fa/generate', generateCode);

/**
 * @swagger
 * /users/2fa/verify:
 *   post:
 *     summary: Verificar código 2FA
 *     tags: [Seguridad]
 */
router.post('/2fa/verify', verifyCode);

router.post('/2fa/generate-temp', generateRegistrationCode);
router.post('/2fa/verify-temp', verifyRegistrationCode);

// RUTAS DE SEGURIDAD LOGIN (LOCKOUT)
router.get('/auth/status/:email', checkLockoutStatus);
router.post('/auth/fail', logFailedAttempt);
router.post('/auth/reset', resetAttempts);

export default router;
