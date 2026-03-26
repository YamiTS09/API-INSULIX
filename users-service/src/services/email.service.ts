import https from 'https';

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SENDER_EMAIL = 'insulix.contacto@gmail.com';

export const sendVerificationEmail = async (email: string, code: string): Promise<void> => {
    const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">INSULIX</h1>
            <p style="color: #7f8c8d; font-size: 14px;">Tu aliado en el control de la diabetes</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center;">
            <h2 style="color: #2c3e50; font-size: 20px; margin-top: 0;">Código de Verificación</h2>
            <p style="color: #34495e; font-size: 16px;">Para continuar, utiliza el siguiente código de 6 dígitos:</p>
            <div style="font-size: 36px; font-weight: bold; color: #3498db; letter-spacing: 10px; margin: 20px 0; padding: 10px; border: 2px dashed #3498db; display: inline-block; background-color: #e8f4fd; border-radius: 5px;">
                ${code}
            </div>
            <p style="color: #e74c3c; font-size: 12px; font-weight: bold;">Este código expira en 5 minutos.</p>
        </div>
        <p style="color: #7f8c8d; font-size: 14px; margin-top: 20px;">Si no solicitaste este código, ignora este correo o contacta a soporte.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <div style="text-align: center; color: #95a5a6; font-size: 12px;">
            © 2026 INSULIX - Todos los derechos reservados
        </div>
    </div>
    `;

    const payload = JSON.stringify({
        sender: { name: 'Insulix Security', email: SENDER_EMAIL },
        to: [{ email }],
        subject: 'Tu código de seguridad de Insulix',
        htmlContent
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`Email enviado exitosamente a ${email} via Brevo`);
                    resolve();
                } else {
                    console.error(`Error de Brevo (${res.statusCode}):`, body);
                    reject(new Error(`No se pudo enviar el correo de verificación`));
                }
            });
        });

        req.on('error', (err) => {
            console.error('Error de red al contactar Brevo:', err);
            reject(new Error('No se pudo enviar el correo de verificación'));
        });

        req.write(payload);
        req.end();
    });
};
