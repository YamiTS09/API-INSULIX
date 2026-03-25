import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendVerificationEmail = async (email: string, code: string) => {
    const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">INSULIX</h1>
            <p style="color: #7f8c8d; font-size: 14px;">Tu aliado en el control de la diabetes</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center;">
            <h2 style="color: #2c3e50; font-size: 20px; margin-top: 0;">Código de Verificación</h2>
            <p style="color: #34495e; font-size: 16px;">Para continuar con tu inicio de sesión, utiliza el siguiente código de 6 dígitos:</p>
            <div style="font-size: 36px; font-weight: bold; color: #3498db; letter-spacing: 10px; margin: 20px 0; padding: 10px; border: 2px dashed #3498db; display: inline-block; background-color: #e8f4fd; border-radius: 5px;">
                ${code}
            </div>
            <p style="color: #e74c3c; font-size: 12px; font-weight: bold;">Este código expira en 5 minutos.</p>
        </div>
        <p style="color: #7f8c8d; font-size: 14px; margin-top: 20px;">Si no solicitaste este código, por favor ignora este correo o contacta a soporte.</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <div style="text-align: center; color: #95a5a6; font-size: 12px;">
            © 2026 INSULIX - Todos los derechos reservados
        </div>
    </div>
    `;

    const mailOptions = {
        from: `"Insulix Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Tu código de seguridad de Insulix',
        html: htmlContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email enviado exitosamente a ${email}`);
    } catch (error) {
        console.error('Error enviando email:', error);
        throw new Error('No se pudo enviar el correo de verificación');
    }
};
