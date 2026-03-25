import { Request, Response } from 'express';
import { pool } from '../models/db';

/**
 * Verifica si un correo está bloqueado por intentos fallidos.
 */
export const checkLockoutStatus = async (req: Request, res: Response) => {
    const { email } = req.params;

    try {
        const result = await pool.query(
            'SELECT intentos_fallidos, bloqueado_hasta FROM usuario WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(200).json({ locked: false });
        }

        const { intentos_fallidos, bloqueado_hasta } = result.rows[0];
        const now = new Date();

        if (bloqueado_hasta && new Date(bloqueado_hasta) > now) {
            const remainingSeconds = Math.ceil((new Date(bloqueado_hasta).getTime() - now.getTime()) / 1000);
            return res.status(200).json({ 
                locked: true, 
                message: 'Cuenta bloqueada temporalmente',
                remainingSeconds 
            });
        }

        // Si el tiempo de bloqueo ya pasó, podríamos resetear aquí o dejar que el reset lo haga el login exitoso
        res.status(200).json({ locked: false, attempts: intentos_fallidos });
    } catch (error: any) {
        console.error('Error al verificar status de bloqueo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/**
 * Registra un intento fallido de login.
 */
export const logFailedAttempt = async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
        const userResult = await pool.query('SELECT usuario_id, intentos_fallidos FROM usuario WHERE email = $1', [email]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const { intentos_fallidos } = userResult.rows[0];
        const nuevosIntentos = intentos_fallidos + 1;
        let bloqueado_hasta = null;

        if (nuevosIntentos >= 3) {
            // Bloquear por 5 minutos
            const lockoutTime = new Date();
            lockoutTime.setMinutes(lockoutTime.getMinutes() + 5);
            bloqueado_hasta = lockoutTime;
        }

        await pool.query(
            'UPDATE usuario SET intentos_fallidos = $1, bloqueado_hasta = $2 WHERE email = $3',
            [nuevosIntentos, bloqueado_hasta, email]
        );

        res.status(200).json({ 
            success: true, 
            attempts: nuevosIntentos, 
            locked: nuevosIntentos >= 3,
            bloqueado_hasta
        });
    } catch (error: any) {
        console.error('Error al registrar intento fallido:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/**
 * Resetea los intentos tras un login exitoso.
 */
export const resetAttempts = async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
        await pool.query(
            'UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE email = $1',
            [email]
        );
        res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Error al resetear intentos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
