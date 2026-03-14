import nodemailer from 'nodemailer';

export const sendTemporaryPasswordEmail = async (to, temporaryPassword) => {
    try {
        const emailService = process.env.EMAIL_SERVICE || 'gmail';
        const emailUser = process.env.EMAIL_USER;
        const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

        if (!emailUser || !emailPassword) {
            throw new Error('Configuración SMTP incompleta: define EMAIL_USER y EMAIL_PASSWORD en backend/.env');
        }

        const transporter = nodemailer.createTransport({
            service: emailService,
            auth: {
                user: emailUser,
                pass: emailPassword
            },
            // Evita que la petición HTTP quede colgada hasta provocar 504 en el proxy.
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
        });

        const info = await transporter.sendMail({
            from: `"Sistema" <${emailUser}>`,
            to,
            subject: 'Tu contraseña temporal',
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Bienvenido al sistema de SushiBurrito</h2>
                    <p>Tu cuenta ha sido creada correctamente.</p>
                    
                    <p><strong>Contraseña temporal:</strong></p>
                    
                    <div style="
                        background: #f4f4f4;
                        padding: 15px;
                        font-size: 18px;
                        font-weight: bold;
                        letter-spacing: 2px;
                        display: inline-block;
                        border-radius: 5px;
                    ">
                        ${temporaryPassword}
                    </div>

                    <p style="margin-top:20px;">
                        ⚠️ Por seguridad, deberás cambiar esta contraseña al iniciar sesión.
                    </p>

                    <p>Si no solicitaste esta cuenta, ignora este correo.</p>
                </div>
            `
        });

        return info;

    } catch (error) {
        console.error("Error enviando correo:", error.message);
        throw new Error(`No se pudo enviar el correo (${error.code || 'SMTP_ERROR'}): ${error.message}`);
    }
};
