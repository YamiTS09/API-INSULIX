import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1]; // Formato: Bearer <token>
        const secret = process.env.JWT_SECRET || 'fallback_secret';

        jwt.verify(token, secret, (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Token inválido o expirado' });
            }

            // Guardar info del usuario decodificada en el request
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ message: 'Se requiere token de autenticación (Authorization: Bearer <token>)' });
    }
};

/**
 * Middleware opcional para asegurar roles (RBAC)
 * Se asume que authenticateJWT se ejecutó antes.
 */
export const requireRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'No tienes el rol necesario para acceder' });
        }

        if (roles.includes(req.user.role)) {
            next();
        } else {
            return res.status(403).json({ message: 'Acceso denegado: Rol insuficiente' });
        }
    };
};
