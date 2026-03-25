import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    // Verificar que el header existe y sigue el formato 'Bearer TOKEN'
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            message: 'Acceso denegado. Se requiere un token de autenticación (Bearer).' 
        });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        // Validar el token con Firebase Admin SDK [cite: 154]
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // Guardamos la información del usuario en el objeto Request
        // para que los controladores sepan quién hizo la petición (uid, email)
        (req as any).user = decodedToken;

        next(); // Continuar al siguiente paso (el controlador)
    } catch (error) {
        console.error('Error al verificar token:', error);
        return res.status(403).json({ 
            message: 'Token inválido o expirado.', 
            error: error 
        });
    }
};