import { Request, Response } from 'express';
import admin from '../config/firebase';
import jwt from 'jsonwebtoken';
import { pool } from '../models/db';

// ==========================================
// Nota: La creación de usuarios o el inicio de sesión
// (Login) con contraseña suele hacerse desde el cliente
// usando Firebase Auth SDK (Frontend).
// El backend (Auth Service) generalmente se usa para
// **verificar** que el token enviado por el frontend
// es válido.
// ==========================================

export const login = async (req: Request, res: Response) => {
    try {
        // En una arquitectura Firebase pura, el cliente (Frontend)
        // se loguea directamente con Firebase, obtiene un idToken
        // y lo envía al backend para autenticar las peticiones.
        // Si tienes algún flujo personalizado (ej: Custom Tokens),
        // este sería el lugar.
        
        res.status(200).json({
            message: 'Utiliza el SDK de cliente de Firebase para iniciar sesión y envía el token a /verify',
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en login', error });
    }
};

export const verifyToken = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ valid: false, message: 'Token no provisto' });
        }

        const idToken = authHeader.split('Bearer ')[1];

        // 1. Verificamos con Firebase
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;

        // 2. Buscar en Postgres el ROL del usuario (y su estado activo) y sus nombres
        const userRes = await pool.query(`
            SELECT u.is_active, r.nombre_rol, u.nombre, u.apellido_paterno, u.apellido_materno,
                   u.is_2fa_enabled, c.tema_oscuro, c.idioma
            FROM usuario u 
            JOIN roles r ON u.rol_id = r.rol_id 
            LEFT JOIN configuracion_usuario c ON u.usuario_id = c.usuario_id
            WHERE u.usuario_id = $1
        `, [uid]);

        if (userRes.rows.length === 0) {
            return res.status(401).json({ valid: false, message: 'Usuario no encontrado en la base de datos local' });
        }

        const userRecord = userRes.rows[0];

        if (!userRecord.is_active) {
            return res.status(403).json({ valid: false, message: 'Cuenta desactivada' });
        }

        const role = userRecord.nombre_rol;
        const nombre = userRecord.nombre;
        const apellido_paterno = userRecord.apellido_paterno || '';
        const apellido_materno = userRecord.apellido_materno || '';
        const is_2fa_enabled = userRecord.is_2fa_enabled || false;
        const tema_oscuro = userRecord.tema_oscuro || false;
        const idioma = userRecord.idioma || 'es';

        // 3. Emitir el Custom JWT de la aplicación
        const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
        const customToken = jwt.sign(
            { uid, email, role, nombre, apellido_paterno, apellido_materno, is_2fa_enabled, tema_oscuro, idioma },
            jwtSecret,
            { expiresIn: '2h' } // El token expira en 2 horas
        );

        // 4. Respondemos con el token personalizado
        res.status(200).json({
            valid: true,
            access_token: customToken,
            user: { uid, email, role, nombre, apellido_paterno, apellido_materno, is_2fa_enabled, tema_oscuro, idioma }
        });
    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(401).json({ valid: false, message: 'Token inválido o expirado' });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        // Opcional: revocar refesh tokens si el cliente provee el uid
        // const { uid } = req.body;
        // await admin.auth().revokeRefreshTokens(uid);
        
        res.status(200).json({ message: 'Cierre de sesión manejado a nivel cliente' });
    } catch (error) {
        res.status(500).json({ message: 'Error en logout', error });
    }
};

export const checkUserExists = async (req: Request, res: Response) => {
    try {
        const { email } = req.params;
        if (!email) {
            return res.status(400).json({ message: 'Email es requerido' });
        }
        
        try {
            await admin.auth().getUserByEmail(email as string);
            return res.status(200).json({ exists: true });
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                return res.status(200).json({ exists: false });
            }
            throw error;
        }
    } catch (error: any) {
        console.error('Error checking user existence in Firebase:', error);
        res.status(500).json({ message: 'Error checking user existence', error: error.message });
    }
};

export const deleteFirebaseUser = async (req: Request, res: Response) => {
    try {
        const { uid } = req.params;
        if (!uid) {
            return res.status(400).json({ message: 'UID es requerido' });
        }
        
        // Agregamos "as string" para solucionar el error TS2345
        await admin.auth().deleteUser(uid as string); 
        
        return res.status(200).json({ message: 'Usuario eliminado de Firebase' });
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ message: 'Usuario no encontrado en Firebase' });
        }
        console.error('Error deleting user from Firebase:', error);
        res.status(500).json({ message: 'Error eliminando usuario en Firebase', error: error.message });
    }
};
