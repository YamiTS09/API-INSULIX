import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

export interface AuthUser extends JwtPayload {
    uid: string;
    role: 'ADMIN' | 'MEDICO' | 'PACIENTE';
    email?: string;
}

export interface AuthRequest extends Request {
    user?: AuthUser;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const [scheme, token] = authHeader?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            message: 'Se requiere token de autenticacion (Authorization: Bearer <token>)'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (typeof decoded === 'string' || !decoded.uid || !decoded.role) {
            return res.status(403).json({ message: 'El token no contiene una identidad valida' });
        }
        req.user = decoded as AuthUser;
        return next();
    } catch {
        return res.status(403).json({ message: 'Token invalido o expirado' });
    }
};

export const requireRole = (roles: AuthUser['role'][]) => (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Acceso denegado: rol insuficiente' });
    }
    return next();
};
