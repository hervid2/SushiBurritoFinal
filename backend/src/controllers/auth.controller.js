// =================================================================
// ARCHIVO: src/controllers/auth.controller.js
// ROL: Controlador que maneja toda la lógica de negocio relacionada
//      con la autenticación, incluyendo inicio de sesión,
//      gestión de tokens y recuperación de contraseñas.
// =================================================================
import db from '../models/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const Usuario = db.Usuario;

/* =====================================================
    LOGIN
===================================================== */
export const login = async (req, res) => {
    try {
        const { correo, contraseña } = req.body;

        const usuario = await Usuario.findOne({
            where: { correo },
            include: [{ model: db.Rol, attributes: ['nombre_rol'] }]
        });

        if (!usuario) {
            return res.status(404).json({
                message: "Usuario no encontrado."
            });
        }

        const passwordIsValid = await bcrypt.compare(
            contraseña,
            usuario.contraseña
        );

        if (!passwordIsValid) {
            return res.status(401).json({
                message: "Contraseña inválida."
            });
        }

        /* 🔥 VALIDACIÓN CLAVE TEMPORAL */
        if (usuario.must_change_password) {
            return res.status(200).json({
                mustChangePassword: true,
                usuario_id: usuario.usuario_id,
                message: "Debe cambiar su contraseña antes de continuar."
            });
        }

        /* =====================================================
            GENERAR TOKENS
        ===================================================== */
        const accessToken = jwt.sign(
            { id: usuario.usuario_id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { id: usuario.usuario_id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            id: usuario.usuario_id,
            nombre: usuario.nombre,
            rol: usuario.Rol.nombre_rol,
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error en el inicio de sesión."
        });
    }
};

/* =====================================================
   CHANGE PASSWORD (Versión Segura)
===================================================== */
export const changePassword = async (req, res) => {
    try {
        const { usuario_id, nuevaContraseña } = req.body;

        if (!usuario_id || !nuevaContraseña) {
            return res.status(400).json({ 
                message: "ID de usuario y nueva contraseña son requeridos." 
            });
        }

        // 1. Encriptar la nueva contraseña aquí
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(nuevaContraseña, salt);

        // 2. Usar Usuario.update en lugar de usuario.save()
        // Esto es más directo y suele evitar los hooks de instancia que causan el doble hash
        const [rowsUpdated] = await Usuario.update(
            { 
                contraseña: hashedPassword, 
                must_change_password: false 
            },
            { 
                where: { usuario_id: usuario_id } 
            }
        );

        if (rowsUpdated === 0) {
            return res.status(404).json({ message: "Usuario no encontrado o no hubo cambios." });
        }

        res.status(200).json({ 
            message: "Contraseña actualizada exitosamente. Por favor, inicie sesión." 
        });

    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        res.status(500).json({ message: "Error interno al procesar el cambio de contraseña." });
    }
};

/* =====================================================
    REFRESH TOKEN
===================================================== */
export const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({
            message: "Refresh Token requerido."
        });
    }

    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const newAccessToken = jwt.sign(
            { id: decoded.id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        res.status(200).json({
            accessToken: newAccessToken
        });

    } catch (error) {
        console.error("🔥 ERROR REFRESH TOKEN:", error.message);
        res.status(500).json({ message: "Sesión expirada o token inválido." });
    }
};