import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.resolve(__dirname, '../../assets/logo.jpg');

let cachedLogoDataUri = null;

function getLogoDataUri() {
    if (cachedLogoDataUri) {
        return cachedLogoDataUri;
    }

    try {
        const logoBuffer = fs.readFileSync(LOGO_PATH);
        cachedLogoDataUri = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
        cachedLogoDataUri = '';
    }

    return cachedLogoDataUri;
}

export const sendTemporaryPasswordEmail = async (to, temporaryPassword) => {
    try {
        const mailProvider = String(process.env.MAIL_PROVIDER || 'smtp').toLowerCase();
        const emailService = process.env.EMAIL_SERVICE || 'gmail';
        const emailUser = process.env.EMAIL_USER;
        const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
        const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
        const emailPort = Number(process.env.EMAIL_PORT || 465);
        const emailSecure = String(process.env.EMAIL_SECURE || 'true').toLowerCase() === 'true';
        const resendApiKey = process.env.RESEND_API_KEY;
        const emailFrom = process.env.EMAIL_FROM || emailUser;
        const logoDataUri = getLogoDataUri();
        const logoMarkup = logoDataUri
            ? `<img src="${logoDataUri}" alt="Sushi Burrito" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #ff5f1f;display:block;margin:0 auto 12px;" />`
            : '';

        const subject = 'Tu contraseña temporal';
        const html = `
                <div style="font-family: Arial, sans-serif;">
                    <div style="text-align:center;margin-bottom:12px;">
                        ${logoMarkup}
                    </div>
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
            `;

        if (mailProvider === 'resend') {
            if (!resendApiKey || !emailFrom) {
                throw new Error('Configuración Resend incompleta: define RESEND_API_KEY y EMAIL_FROM en backend/.env');
            }

            const resendResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${resendApiKey}`
                },
                body: JSON.stringify({
                    from: emailFrom,
                    to: [to],
                    subject,
                    html
                })
            });

            const resendBody = await resendResponse.json().catch(() => ({}));

            if (!resendResponse.ok) {
                throw new Error(`Resend ${resendResponse.status}: ${resendBody.message || resendBody.error || 'No fue posible enviar el correo.'}`);
            }

            return resendBody;
        }

        if (!emailUser || !emailPassword) {
            throw new Error('Configuración SMTP incompleta: define EMAIL_USER y EMAIL_PASSWORD en backend/.env');
        }

        const baseTransport = {
            auth: {
                user: emailUser,
                pass: emailPassword
            },
            // Evita que la petición HTTP quede colgada hasta provocar 504 en el proxy.
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
        };

        const transporter = nodemailer.createTransport(
            process.env.EMAIL_HOST || process.env.EMAIL_PORT || process.env.EMAIL_SECURE
                ? {
                    ...baseTransport,
                    host: emailHost,
                    port: emailPort,
                    secure: emailSecure
                }
                : {
                    ...baseTransport,
                    service: emailService
                }
        );

        const info = await transporter.sendMail({
            from: `"Sistema" <${emailFrom}>`,
            to,
            subject,
            html
        });

        return info;

    } catch (error) {
        console.error("Error enviando correo:", error.message);
        throw new Error(`No se pudo enviar el correo (${error.code || 'SMTP_ERROR'}): ${error.message}`);
    }
};
