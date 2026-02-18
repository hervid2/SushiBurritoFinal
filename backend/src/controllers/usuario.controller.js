// =================================================================
// ARCHIVO: src/controllers/usuario.controller.js
// ROL: Controlador que maneja la lógica de negocio para las
//      operaciones CRUD de la entidad 'Usuario'.
// =================================================================

import db from '../models/index.js';
import crypto from 'crypto';
import { sendTemporaryPasswordEmail } from '../helpers/email.js';

const Usuario = db.Usuario;


/* =====================================================
   CREAR USUARIO CON CONTRASEÑA TEMPORAL
===================================================== */
export const createUser = async (req, res) => {
    try {
        const { correo, rol_id } = req.body;

        const usuarioExistente = await Usuario.findOne({ where: { correo } });

        if (usuarioExistente) {
            return res.status(400).json({
                message: "El usuario ya existe."
            });
        }

        // Generar contraseña temporal
        const contraseñaTemporal = crypto.randomBytes(6).toString('hex');

        console.log("🔐 CONTRASEÑA TEMPORAL:", contraseñaTemporal);


        // ⚠️ NO encriptamos aquí (el modelo lo hace automáticamente)
        await Usuario.create({
    nombre: "Pendiente",
    correo,
    rol_id,
    contraseña: contraseñaTemporal,
    must_change_password: true
});

try {
    await sendTemporaryPasswordEmail(correo, contraseñaTemporal);
} catch (emailError) {
    console.error("⚠️ Error enviando correo:", emailError);
}

        // Enviar correo
        await sendTemporaryPasswordEmail(correo, contraseñaTemporal);

        res.status(201).json({
            message: "Usuario creado y contraseña temporal enviada."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error al crear usuario."
        });
    }
};


/* =====================================================
   USUARIOS ELIMINADOS
===================================================== */
export const getDeletedUsers = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            paranoid: false,
            where: {
                deleted_at: { [db.Sequelize.Op.not]: null }
            }
        });

        res.json(usuarios);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* =====================================================
   LISTAR USUARIOS ACTIVOS
===================================================== */
export const getAllUsers = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({

            // 🔥 Eliminado is_deleted (NO existe en tu modelo)

            attributes: { exclude: ['contraseña', 'rol_id'] },
            include: [{ model: db.Rol, attributes: ['nombre_rol'] }]
        });

        const respuesta = usuarios.map(u => ({
            usuario_id: u.usuario_id,
            nombre: u.nombre,
            correo: u.correo,
            rol: u.Rol.nombre_rol
        }));

        res.status(200).json(respuesta);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* =====================================================
   OBTENER USUARIO POR ID
===================================================== */
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const usuario = await Usuario.findByPk(id, {
            attributes: { exclude: ['contraseña', 'rol_id'] },
            include: [{ model: db.Rol, attributes: ['nombre_rol'] }]
        });

        if (!usuario) {
            return res.status(404).json({
                message: `Usuario con id=${id} no encontrado.`
            });
        }

        res.json({
            usuario_id: usuario.usuario_id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.Rol.nombre_rol
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* =====================================================
   ACTUALIZAR USUARIO
===================================================== */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, correo } = req.body;

        const [num] = await Usuario.update(
            { nombre, correo },
            { where: { usuario_id: id } }
        );

        if (num === 1) {
            return res.json({
                message: "Usuario actualizado exitosamente."
            });
        }

        return res.status(404).json({
            message: "Usuario no encontrado o sin cambios."
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* =====================================================
   SOFT DELETE
===================================================== */
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const num = await Usuario.destroy({
            where: { usuario_id: id }
        });

        res.json({
            message: num === 1
                ? "Usuario eliminado correctamente (soft delete)."
                : "Usuario no encontrado."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error al eliminar usuario."
        });
    }
};


/* =====================================================
   RESTORE USER
===================================================== */
export const restoreUser = async (req, res) => {
    try {
        const { id } = req.params;

        const usuario = await Usuario.findByPk(id, {
            paranoid: false
        });

        if (!usuario) {
            return res.status(404).json({
                message: "Usuario no encontrado."
            });
        }

        await usuario.restore();

        res.json({
            message: "Usuario restaurado correctamente."
        });

    } catch (error) {
        res.status(500).json({
            message: "Error al restaurar usuario."
        });
    }
};


/* =====================================================
   HARD DELETE
===================================================== */
export const deleteUserPermanent = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedRows = await Usuario.destroy({
            where: { usuario_id: id },
            force: true
        });

        if (deletedRows === 1) {
            return res.json({
                message: "Usuario eliminado definitivamente."
            });
        }

        return res.status(404).json({
            message: "Usuario no encontrado."
        });

    } catch (error) {
        res.status(500).json({
            message: "Error al eliminar definitivamente."
        });
    }
};


/* =====================================================
   CAMBIAR CONTRASEÑA (PRIMER LOGIN)
===================================================== */
export const changePassword = async (req, res) => {
    try {
        const { usuario_id, nuevaContraseña } = req.body;

        const usuario = await Usuario.findByPk(usuario_id);

        if (!usuario) {
            return res.status(404).json({
                message: "Usuario no encontrado."
            });
        }

        // ⚠️ No encriptamos manualmente
        usuario.contraseña = nuevaContraseña;
        usuario.must_change_password = false;

        await usuario.save();

        res.json({
            message: "Contraseña actualizada correctamente."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error al cambiar contraseña."
        });
    }
};




