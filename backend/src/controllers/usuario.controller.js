// =================================================================
// ARCHIVO: src/controllers/usuario.controller.js
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
        const { nombre, correo, rol_id } = req.body;

        const usuarioExistente = await Usuario.findOne({ where: { correo } });

        if (usuarioExistente) {
            return res.status(400).json({ message: "El usuario ya existe." });
        }

        const contraseñaTemporal = crypto.randomBytes(6).toString('hex');
        console.log("🔐 CONTRASEÑA TEMPORAL:", contraseñaTemporal);

        await Usuario.create({
            nombre,
            correo,
            rol_id: parseInt(rol_id), // Forzamos entero para evitar el error de "siempre mesero"
            contraseña: contraseñaTemporal,
            must_change_password: true,
            is_deleted: 0 // Usuario nuevo empieza activo
        });

        try {
            await sendTemporaryPasswordEmail(correo, contraseñaTemporal);
        } catch (emailError) {
            console.error("⚠️ Error enviando correo:", emailError);
        }

        res.status(201).json({ message: "Usuario creado y contraseña temporal enviada." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al crear usuario." });
    }
};

/* =====================================================
   USUARIOS ELIMINADOS (PAPELERA)
===================================================== */
export const getDeletedUsers = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            // 🔥 CLAVE: Permite ver registros con fecha en deleted_at
            paranoid: false, 
            where: { is_deleted: 1 },
            include: [{
                model: db.Rol,
                attributes: ['nombre_rol']
            }]
        });

        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ message: "Error al cargar la papelera" });
    }
};

/* =====================================================
   LISTAR USUARIOS ACTIVOS
===================================================== */
export const getAllUsers = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            where: { is_deleted: 0 }, // Solo los que no están borrados
            attributes: { exclude: ['contraseña'] },
            include: [{ model: db.Rol, attributes: ['nombre_rol'] }]
        });

        const respuesta = usuarios.map(u => ({
            usuario_id: u.usuario_id,
            nombre: u.nombre,
            correo: u.correo,
            rol: u.Rol ? u.Rol.nombre_rol : 'Sin Rol'
        }));

        res.status(200).json(respuesta);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* =====================================================
   SOFT DELETE (Mover a papelera)
===================================================== */
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscamos al usuario (incluso si Sequelize lo ocultaba por tener fecha en deleted_at)
        const usuario = await Usuario.findByPk(id, { paranoid: false });

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // Forzamos el cambio de estado y la fecha de eliminación
        usuario.is_deleted = 1;
        usuario.deleted_at = new Date();

        // Guardamos los cambios físicamente en la base de datos
        await usuario.save();

        res.json({ 
            message: "Usuario enviado a la papelera.",
            id_eliminado: id 
        });

    } catch (error) {
        console.error("Error al eliminar:", error);
        res.status(500).json({ message: "Error al procesar la eliminación." });
    }
};
/* =====================================================
   RESTORE USER (Sacar de papelera)
===================================================== */
export const restoreUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscamos al usuario ignorando el filtro de borrado
        const usuario = await Usuario.findByPk(id, { paranoid: false });

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Restauramos los valores originales
        usuario.is_deleted = 0;
        usuario.deleted_at = null;

        await usuario.save();

        res.json({ message: "Usuario restaurado con éxito" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al restaurar el usuario" });
    }
};

/* =====================================================
   HARD DELETE (Borrado físico)
===================================================== */
export const deleteUserPermanent = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscamos al usuario incluyendo los que ya están en la papelera
        const usuario = await Usuario.findByPk(id, { paranoid: false });

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // 🚀 FORCE: TRUE es la clave aquí para el borrado físico
        await usuario.destroy({ force: true });

        res.json({ message: "Usuario eliminado permanentemente de la base de datos" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al eliminar definitivamente" });
    }
};

/* =====================================================
   CAMBIAR CONTRASEÑA, ACTUALIZAR Y GET BY ID (SIN CAMBIOS)
===================================================== */
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id, {
            include: [{ model: db.Rol, attributes: ['nombre_rol'] }]
        });
        if (!usuario) return res.status(404).json({ message: "No encontrado." });
        res.json({
            usuario_id: usuario.usuario_id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.Rol ? usuario.Rol.nombre_rol : 'Sin Rol'
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, correo } = req.body;
        const [num] = await Usuario.update({ nombre, correo }, { where: { usuario_id: id } });
        res.json({ message: num === 1 ? "Actualizado." : "Sin cambios." });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

export const changePassword = async (req, res) => {
    try {
        const usuario_id = req.userId;
        const { nuevaContraseña } = req.body;
        if (!nuevaContraseña || nuevaContraseña.length < 8) return res.status(400).json({ message: "Mínimo 8 caracteres." });
        const usuario = await Usuario.findByPk(usuario_id);
        if (!usuario) return res.status(404).json({ message: "No encontrado." });
        usuario.contraseña = nuevaContraseña;
        usuario.must_change_password = false;
        await usuario.save();
        res.json({ message: "Contraseña actualizada." });
    } catch (error) { res.status(500).json({ message: "Error." }); }
};