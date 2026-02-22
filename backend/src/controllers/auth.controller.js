// =================================================================
// ARCHIVO: src/controllers/auth.controller.js
// ROL: Controlador que maneja toda la lógica de negocio relacionada
//      con la autenticación, incluyendo inicio de sesión,
//      gestión de tokens y recuperación de contraseñas.
// =================================================================

import db from '../models/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer'; 

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.TOKEN_EXPIRATION || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || process.env.REFRESH_EXPIRATION || '7d';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refreshToken';
const REFRESH_TOKEN_MAX_AGE_MS = Number(process.env.REFRESH_TOKEN_MAX_AGE_MS) || (7 * 24 * 60 * 60 * 1000);

/**
 * Crea un access token de corta duración para autorizar peticiones a la API.
 * @param {number} userId - Identificador del usuario autenticado.
 * @returns {string} JWT firmado.
 */
const createAccessToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN
    });
};

/**
 * Crea un refresh token con identificador único de sesión para permitir rotación.
 * @param {number} userId - Identificador del usuario autenticado.
 * @param {string} sessionId - Identificador único para la sesión de refresh.
 * @returns {string} JWT firmado.
 */
const createRefreshToken = (userId, sessionId) => {
    return jwt.sign({ id: userId, sessionId }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN
    });
};

/**
 * Convierte un token en hash SHA-256 para almacenar solo un valor no reversible.
 * @param {string} token - Token en texto plano.
 * @returns {string} Hash hexadecimal.
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Registra la cookie segura con el refresh token para evitar exponerlo en JavaScript.
 * @param {object} res - Objeto de respuesta de Express.
 * @param {string} refreshTokenValue - Refresh token firmado.
 */
const setRefreshCookie = (res, refreshTokenValue) => {
    res.cookie(REFRESH_COOKIE_NAME, refreshTokenValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: REFRESH_TOKEN_MAX_AGE_MS
    });
};

/**
 * Elimina la cookie del refresh token del cliente.
 * @param {object} res - Objeto de respuesta de Express.
 */
const clearRefreshCookie = (res) => {
    res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth'
    });
};

// --- INICIO DE SESIÓN ---
/**
 * Procesa la solicitud de inicio de sesión de un usuario.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const login = async (req, res) => {
    try {
        const { correo, contraseña } = req.body;
        // Busca al usuario por su correo e incluye la información de su rol.
        const usuario = await db.Usuario.findOne({
            where: { correo: correo },
            include: [{ model: db.Rol, attributes: ['nombre_rol'] }]
        });

        if (!usuario) return res.status(404).send({ message: "Usuario no encontrado." });

        // Compara de forma segura la contraseña proporcionada con el hash almacenado.
        const passwordIsValid = bcrypt.compareSync(contraseña, usuario.contraseña);
        if (!passwordIsValid) return res.status(401).send({ message: "Contraseña inválida." });

        // Se genera un token de acceso y un refresh token rotativo asociado a sesión.
        const accessToken = createAccessToken(usuario.usuario_id);
        const sessionId = crypto.randomUUID();
        const refreshTokenValue = createRefreshToken(usuario.usuario_id, sessionId);

        // Se guarda solo el hash del refresh token para reducir impacto ante fuga de base de datos.
        await db.RefreshTokenSession.create({
            session_id: sessionId,
            usuario_id: usuario.usuario_id,
            token_hash: hashToken(refreshTokenValue),
            expires_at: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
            user_agent: req.headers['user-agent'] || null,
            ip_address: req.ip || null
        });

        // El refresh token se envía en cookie httpOnly para impedir acceso desde scripts del navegador.
        setRefreshCookie(res, refreshTokenValue);

        // Se envía la información del usuario y el access token al cliente.
        res.status(200).send({
            id: usuario.usuario_id,
            nombre: usuario.nombre,
            rol: usuario.Rol.nombre_rol, 
            accessToken
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// --- REFRESCAR EL TOKEN DE ACCESO ---
/**
 * Genera un nuevo accessToken utilizando un refreshToken válido.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const refreshToken = async (req, res) => {
    const refreshTokenValue = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    if (!refreshTokenValue) {
        return res.status(401).send({ message: "Refresh Token es requerido." });
    }

    try {
        // Verifica el refresh token con su secreto correspondiente.
        const decoded = jwt.verify(refreshTokenValue, process.env.REFRESH_TOKEN_SECRET);
        const tokenHash = hashToken(refreshTokenValue);

        // Busca una sesión activa que coincida exactamente con el token presentado.
        const activeSession = await db.RefreshTokenSession.findOne({
            where: {
                session_id: decoded.sessionId,
                usuario_id: decoded.id,
                token_hash: tokenHash,
                revoked_at: null,
                expires_at: {
                    [db.Sequelize.Op.gt]: new Date()
                }
            }
        });

        if (!activeSession) {
            // Si se detecta reutilización, se revocan todas las sesiones activas del usuario.
            await db.RefreshTokenSession.update(
                { revoked_at: new Date() },
                { where: { usuario_id: decoded.id, revoked_at: null } }
            );
            clearRefreshCookie(res);
            return res.status(403).send({ message: "Refresh Token inválido o reutilizado." });
        }

        // Rotación de refresh token: invalida el token usado y emite uno nuevo.
        const newSessionId = crypto.randomUUID();
        const newRefreshTokenValue = createRefreshToken(decoded.id, newSessionId);
        const newRefreshTokenHash = hashToken(newRefreshTokenValue);

        await db.sequelize.transaction(async (transaction) => {
            await activeSession.update({
                revoked_at: new Date(),
                replaced_by_token_hash: newRefreshTokenHash
            }, { transaction });

            await db.RefreshTokenSession.create({
                session_id: newSessionId,
                usuario_id: decoded.id,
                token_hash: newRefreshTokenHash,
                expires_at: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
                user_agent: req.headers['user-agent'] || null,
                ip_address: req.ip || null
            }, { transaction });
        });

        // Si es válido, genera un NUEVO accessToken de corta duración.
        const newAccessToken = createAccessToken(decoded.id);

        // Se reemplaza la cookie para continuar la sesión sin obligar nuevo login.
        setRefreshCookie(res, newRefreshTokenValue);

        res.status(200).send({ accessToken: newAccessToken });

    } catch (error) {
        // Si el refresh token es inválido o ha expirado, el usuario debe volver a loguearse.
        clearRefreshCookie(res);
        return res.status(403).send({ message: "Refresh Token inválido o expirado. Por favor, inicie sesión de nuevo." });
    }
};

// --- CIERRE DE SESIÓN ---
/**
 * Revoca la sesión de refresh token actual y limpia la cookie del cliente.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const logout = async (req, res) => {
    try {
        const refreshTokenValue = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

        if (refreshTokenValue) {
            const decoded = jwt.verify(refreshTokenValue, process.env.REFRESH_TOKEN_SECRET);

            await db.RefreshTokenSession.update(
                { revoked_at: new Date() },
                {
                    where: {
                        session_id: decoded.sessionId,
                        usuario_id: decoded.id,
                        revoked_at: null
                    }
                }
            );
        }

        clearRefreshCookie(res);
        return res.status(200).send({ message: "Sesión cerrada exitosamente." });
    } catch (error) {
        // Ante errores de token, se limpia cookie igualmente para cerrar sesión del cliente.
        clearRefreshCookie(res);
        return res.status(200).send({ message: "Sesión cerrada exitosamente." });
    }
};

// --- SOLICITUD DE RESTABLECIMIENTO DE CONTRASEÑA ---
/**
 * Inicia el proceso de restablecimiento de contraseña enviando un correo al usuario.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const forgotPassword = async (req, res) => {
    const { correo } = req.body;

    try {
        const usuario = await db.Usuario.findOne({ where: { correo } });
        if (!usuario) {
            // Medida de seguridad: Se envía una respuesta genérica para no revelar si un correo existe o no.
            return res.status(200).send({ message: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña." });
        }

        // Se crea un token de restablecimiento de corta duración.
        const resetToken = jwt.sign({ id: usuario.usuario_id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

        // Se construye el enlace que apunta a la vista del frontend.
        const resetLink = `http://localhost:5173/#/reset-password?token=${resetToken}`;
    
        await sendPasswordResetEmail(usuario.correo, resetLink); 
        
        res.status(200).send({ message: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña." });

    } catch (error) {
        console.error("Error en forgotPassword:", error);
        res.status(500).send({ message: "Error interno al procesar la solicitud." });
    }
};

// --- RESTABLECIMIENTO FINAL DE LA CONTRASEÑA ---
/**
 * Actualiza la contraseña del usuario utilizando un token de restablecimiento válido.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).send({ message: "Token y nueva contraseña son requeridos." });
    }

    try {
        // Se verifica la validez y expiración del token.
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // Se hashea la nueva contraseña antes de guardarla.
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Se actualiza la contraseña del usuario en la base de datos.
        const updated = await db.Usuario.update(
            { contraseña: hashedPassword },
            { where: { usuario_id: decoded.id } }
        );

        if (updated[0] === 0) {
            return res.status(404).send({ message: "Usuario no encontrado o token inválido." });
        }

        res.status(200).send({ message: "Contraseña actualizada exitosamente." });

    } catch (error) {
        // Se manejan errores específicos de JWT para dar feedback claro al usuario.
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).send({ message: "El token ha expirado. Por favor, solicita un nuevo enlace." });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).send({ message: "Token inválido." });
        }
        res.status(500).send({ message: "Error al restablecer la contraseña." });
    }
};

// --- FUNCIÓN AUXILIAR PARA ENVIAR CORREO ---
/**
 * Función no exportada que configura y envía el correo de restablecimiento.
 * @param {string} recipientEmail - La dirección de correo del destinatario.
 * @param {string} resetLink - El enlace completo para restablecer la contraseña.
 */
async function sendPasswordResetEmail(recipientEmail, resetLink) {
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    await transporter.sendMail({
        from: `"Soporte Sushi Burrito" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: 'Restablece tu Contraseña',
        html: `
            <p>Hola,</p>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
            <p><a href="${resetLink}">Restablecer mi contraseña</a></p>
            <p>Si no solicitaste esto, por favor ignora este correo.</p>
            <p>Este enlace es válido por 15 minutos.</p>
        `
    });
}
