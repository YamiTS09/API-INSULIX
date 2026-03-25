import { Request, Response } from 'express';
import { pool } from '../models/db';
import { sendVerificationEmail } from '../services/email.service';

/**
 * Genera un código de 6 dígitos, lo guarda en la DB y lo envía por correo.
 */
export const generateCode = async (req: Request, res: Response) => {
    const { uid, email } = req.body;

    if (!uid || !email) {
        return res.status(400).json({ error: 'UID y Email son requeridos' });
    }

    try {
        // 1. Generar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 2. Definir expiración (5 minutos)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // 3. Guardar en la base de datos
        // Inactivamos códigos previos del mismo usuario para evitar confusiones
        await pool.query(
            'UPDATE codigos_verificacion SET usado = true WHERE usuario_id = $1 AND usado = false',
            [uid]
        );

        await pool.query(
            'INSERT INTO codigos_verificacion (usuario_id, codigo, expira_en) VALUES ($1, $2, $3)',
            [uid, code, expiresAt]
        );

        // 4. Enviar correo
        await sendVerificationEmail(email, code);

        res.status(200).json({ message: 'Código enviado exitosamente' });
    } catch (error: any) {
        console.error('Error generando código 2FA:', error);
        res.status(500).json({ error: 'Error al procesar el 2FA', details: error.message });
    }
};

/**
 * Verifica si el código proporcionado es válido y no ha expirado.
 */
export const verifyCode = async (req: Request, res: Response) => {
    const { uid, code } = req.body;

    if (!uid || !code) {
        return res.status(400).json({ error: 'UID y Código son requeridos' });
    }

    try {
        // 1. Buscar el código más reciente no usado para el usuario
        const result = await pool.query(
            `SELECT * FROM codigos_verificacion 
             WHERE usuario_id = $1 AND usado = false 
             ORDER BY created_at DESC LIMIT 1`,
            [uid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ valid: false, message: 'No hay códigos activos. Solicita uno nuevo.' });
        }

        const verification = result.rows[0];

        // 2. Verificar si el código coincide
        if (verification.codigo !== code) {
            const nuevosIntentos = verification.intentos + 1;
            
            if (nuevosIntentos >= 3) {
                // Bloquear el código por exceso de intentos
                await pool.query(
                    'UPDATE codigos_verificacion SET usado = true, intentos = $1 WHERE id = $2',
                    [nuevosIntentos, verification.id]
                );
                return res.status(401).json({ 
                    valid: false, 
                    message: 'Código bloqueado por demasiados intentos fallidos. Solicita uno nuevo.' 
                });
            } else {
                // Incrementar intentos
                await pool.query(
                    'UPDATE codigos_verificacion SET intentos = $1 WHERE id = $2',
                    [nuevosIntentos, verification.id]
                );
                return res.status(401).json({ 
                    valid: false, 
                    message: `Código incorrecto. Te quedan ${3 - nuevosIntentos} intentos.` 
                });
            }
        }

        // 3. Verificar si expiró
        if (new Date() > new Date(verification.expira_en)) {
            await pool.query('UPDATE codigos_verificacion SET usado = true WHERE id = $1', [verification.id]);
            return res.status(401).json({ valid: false, message: 'El código ha expirado. Solicita uno nuevo.' });
        }

        // 4. Marcar como usado y éxito
        await pool.query(
            'UPDATE codigos_verificacion SET usado = true WHERE id = $1',
            [verification.id]
        );

        res.status(200).json({ valid: true, message: 'Acceso concedido' });
    } catch (error: any) {
        console.error('Error verificando código 2FA:', error);
        res.status(500).json({ error: 'Error al verificar el código', details: error.message });
    }
};

/**
 * Genera un código de 6 dígitos para un usuario NO registrado,
 * lo guarda en la DB (codigos_registro) y lo envía por correo.
 */
export const generateRegistrationCode = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'El Email es requerido' });
    }

    try {
        // 1. Verificar si el correo ya está registrado en Firebase (vía Auth Service)
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
        try {
            const authRes = await fetch(`${authServiceUrl}/exists/${encodeURIComponent(email)}`);
            if (authRes.ok) {
                const authData: any = await authRes.json();
                if (authData.exists) {
                    return res.status(400).json({ 
                        message: 'Credenciales invalidas, intenta con otro correo.' 
                    });
                }
            }
        } catch (authError) {
            console.error('Error al contactar auth-service:', authError);
            // Continuamos con el chequeo local como respaldo si falla el microservicio
        }

        // 2. Verificar si el correo ya está registrado en la base de datos local
        const userCheck = await pool.query(
            'SELECT email FROM usuario WHERE LOWER(email) = LOWER($1)',
            [email]
        );

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ 
                message: 'Credenciales invalidas, intenta con otro correo.' 
            });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await pool.query(
            'UPDATE codigos_registro SET usado = true WHERE email = $1 AND usado = false',
            [email]
        );

        await pool.query(
            'INSERT INTO codigos_registro (email, codigo, expira_en) VALUES ($1, $2, $3)',
            [email, code, expiresAt]
        );

        await sendVerificationEmail(email, code);

        res.status(200).json({ message: 'Código de registro enviado exitosamente' });
    } catch (error: any) {
        console.error('Error generando código de registro:', error);
        res.status(500).json({ message: 'Error al procesar el código de registro', details: error.message });
    }
};

/**
 * Verifica si el código proporcionado para el registro es válido.
 */
export const verifyRegistrationCode = async (req: Request, res: Response) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Email y Código son requeridos' });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM codigos_registro 
             WHERE email = $1 AND usado = false 
             ORDER BY created_at DESC LIMIT 1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ valid: false, message: 'No hay códigos activos para este correo. Solicita uno nuevo.' });
        }

        const verification = result.rows[0];

        if (verification.codigo !== code) {
            const nuevosIntentos = verification.intentos + 1;
            
            if (nuevosIntentos >= 3) {
                await pool.query(
                    'UPDATE codigos_registro SET usado = true, intentos = $1 WHERE id = $2',
                    [nuevosIntentos, verification.id]
                );
                return res.status(401).json({ valid: false, message: 'Código bloqueado por demasiados intentos. Solicita uno nuevo.' });
            } else {
                await pool.query(
                    'UPDATE codigos_registro SET intentos = $1 WHERE id = $2',
                    [nuevosIntentos, verification.id]
                );
                return res.status(401).json({ valid: false, message: `Código incorrecto. Te quedan ${3 - nuevosIntentos} intentos.` });
            }
        }

        if (new Date() > new Date(verification.expira_en)) {
            await pool.query('UPDATE codigos_registro SET usado = true WHERE id = $1', [verification.id]);
            return res.status(401).json({ valid: false, message: 'El código ha expirado. Solicita uno nuevo.' });
        }

        await pool.query('UPDATE codigos_registro SET usado = true WHERE id = $1', [verification.id]);

        res.status(200).json({ valid: true, message: 'Correo verificado exitosamente' });
    } catch (error: any) {
        console.error('Error verificando código de registro:', error);
        res.status(500).json({ error: 'Error al verificar el código', details: error.message });
    }
};
