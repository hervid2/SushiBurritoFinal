// =================================================================
// ARCHIVO: src/middleware/auth.middleware.js
// ROL: Define los middlewares de seguridad para la autenticación
//      y autorización de las peticiones a la API.
// =================================================================

import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import { env } from '../config/env.js';

/**
 * Middleware para verificar la validez de un JSON Web Token (JWT).
 * Comprueba si el token existe, si no ha expirado y si su firma es correcta.
 *
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 * @param {function} next - La función callback para pasar el control al siguiente middleware.
 */
export const verifyToken = (req, res, next) => {
    // Se busca el token en la cabecera 'Authorization' de la petición.
    const authHeader = req.headers['authorization'];
    // El formato esperado es "Bearer <token>". Se extrae solo el token.
    const token = authHeader && authHeader.split(' ')[1];

    // Si no se proporciona un token, se rechaza la petición.
    if (!token) {
        return res.status(403).send({ message: "No se proporcionó un token." });
    }

    // Se verifica el token usando el secreto guardado en las variables de entorno.
    jwt.verify(token, env.accessTokenSecret, (err, decoded) => {
        // Si hay un error en la verificación (token inválido, expirado, etc.), se rechaza.
        if (err) {
            return res.status(401).send({ message: "No autorizado. Token inválido." });
        }
        
        // Si el token es válido, se extrae el ID del usuario del payload decodificado
        // y se añade al objeto de la petición para que esté disponible en los siguientes pasos.
        req.userId = decoded.id;
        
        // Se llama a next() para pasar la petición al siguiente middleware o al controlador.
        next();
    });
};

/**
 * Middleware para verificar si el usuario autenticado tiene el rol de 'administrador'.
 * Este middleware DEBE ejecutarse después de verifyToken.
 *
 * @param {object} req - El objeto de la petición de Express (debe contener req.userId).
 * @param {object} res - El objeto de la respuesta de Express.
 * @param {function} next - La función callback para pasar el control.
 */
export const isAdmin = async (req, res, next) => {
    try {
        // Se busca al usuario en la base de datos usando el ID adjuntado por verifyToken.
        // Se incluye el modelo Rol para obtener la información del rol en la misma consulta.
        const usuario = await db.Usuario.findByPk(req.userId, {
            include: [{
                model: db.Rol,
                attributes: ["nombre_rol"], // Solo se necesita el nombre del rol.
            }]
        });

        // Si no se encuentra un usuario con ese ID, se devuelve un error.
        if (!usuario) {
            return res.status(404).send({ message: "Usuario no encontrado." });
        }

        // Se comprueba si el nombre del rol del usuario es 'administrador'.
        if (usuario.Rol && usuario.Rol.nombre_rol === 'administrador') {
            // Si es administrador, se permite que la petición continúe.
            next();
            return;
        }
        
        // Si no es administrador, se rechaza la petición con un error de permisos.
        res.status(403).send({ message: 'Requiere rol de Administrador.' });

    } catch (error) {
        // Manejo de errores internos del servidor.
        res.status(500).send({ message: error.message });
    }
};
