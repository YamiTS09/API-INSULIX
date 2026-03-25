import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            message: 'Acceso denegado. Se requiere un token de autenticación (Bearer).' 
        });
    }

    try {
        // En un esquema de microservicios, delegamos la validación del JWT al auth-service.
        // auth-service debe estar corriendo en el puerto 3000 (o el configurado).
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
        
        const response = await axios.get(`${authServiceUrl}/verify`, {
            headers: { Authorization: authHeader }
        });

        // Si el token es válido, auth-service devuelve status 200 y los datos del usuario.
        if (response.data && response.data.valid) {
            (req as any).user = response.data.user;
            next();
        } else {
            return res.status(403).json({ message: 'Token inválido o expirado.' });
        }
    } catch (error: any) {
        console.error('Error al verificar token con auth-service:', error.message);
        return res.status(403).json({ 
            message: 'Token inválido o expirado, o refutado por el auth-service.', 
            error: error.response?.data || error.message 
        });
    }
};
