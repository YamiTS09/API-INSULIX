import { Router } from 'express';
import { login, verifyToken, logout, checkUserExists, deleteFirebaseUser } from '../controllers/auth.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Autenticación
 *     description: Control de acceso y sesiones usando Firebase
 */

/**
 * @swagger
 * /exists/{email}:
 *   get:
 *     summary: Verificar si un correo ya existe en Firebase
 *     description: Consulta a Firebase Auth para saber si el correo ya tiene una cuenta.
 *     tags: [Autenticación]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resultado de la búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 */
router.get('/exists/:email', checkUserExists);

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Endpoint ilustrativo. En Firebase, el login suele hacerse en el cliente.
 *     tags: [Autenticación]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 */
router.post('/login', login);

/**
 * @swagger
 * /verify:
 *   get:
 *     summary: Verificar sesión (Token de Firebase)
 *     description: Valida el idToken enviado en las cabezeras de la solicitud.
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: El token es válido
 *       401:
 *         description: El token es inválido o expiró
 */
router.get('/verify', verifyToken);

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Finaliza la sesión actual.
 *     tags: [Autenticación]
 *     responses:
 *       200:
 *         description: Logout exitoso
 */
router.post('/logout', logout);

/**
 * @swagger
 * /firebase/{uid}:
 *   delete:
 *     summary: Eliminar usuario de Firebase Auth
 *     description: Borra la cuenta de un usuario en Firebase Auth usando su UID.
 *     tags: [Autenticación]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error eliminando el usuario
 */
router.delete('/firebase/:uid', deleteFirebaseUser);

export default router;
