import nodemailer from 'nodemailer';

export const sendTemporaryPasswordEmail = async (to, temporaryPassword) => {
    try {

        console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS // Contraseña de aplicación de Gmail
            }
        });

        const info = await transporter.sendMail({
            from: `"Sistema" <${process.env.EMAIL_USER}>`,
            to,
            subject: 'Tu contraseña temporal',
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Bienvenido al sistema</h2>
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

        console.log("Correo enviado correctamente:", info.messageId);

    } catch (error) {
        console.error("Error enviando correo:", error);
        throw new Error("No se pudo enviar el correo.");
    }
};
