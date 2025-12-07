// =================================================================
// ARCHIVO: src/controllers/usuario.controller.js
// ROL: Controlador que maneja la lógica de negocio para las
//      operaciones CRUD de la entidad 'Usuario'.
// =================================================================

import db from '../models/index.js';

/**
 * Crea un nuevo usuario en la base de datos.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const createUser = async (req, res) => {
    try {
        const { nombre, rol, correo, contraseña } = req.body;
        // Se busca el ID del rol basado en su nombre para asegurar que es válido.
        const rolEncontrado = await db.Rol.findOne({ where: { nombre_rol: rol } });
        if (!rolEncontrado) return res.status(400).send({ message: "El rol especificado no existe." });

        // Se crea el usuario. El hook 'beforeCreate' en el modelo se encargará de hashear la contraseña.
        await db.Usuario.create({ nombre, correo, contraseña, rol_id: rolEncontrado.rol_id });
        res.status(201).send({ message: "Usuario creado exitosamente." });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Obtiene una lista de todos los usuarios, incluyendo el nombre de su rol.
 * Excluye datos sensibles como la contraseña de la respuesta.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const getAllUsers = async (req, res) => {
    try {
        const usuarios = await db.Usuario.findAll({
            where: { is_deleted:0}, //Agregue esto 19/11/25

            // 'attributes.exclude' previene que campos sensibles sean enviados al cliente.
            attributes: { exclude: ['contraseña', 'rol_id'] },
            // Se incluye el modelo Rol para obtener el nombre del rol asociado.
            include: [{ model: db.Rol, attributes: ['nombre_rol'] }]
        });
        
        // Se mapea la respuesta para limpiarla y simplificar su estructura para el frontend.
        const respuesta = usuarios.map(u => ({
            usuario_id: u.usuario_id,
            nombre: u.nombre,
            correo: u.correo,
            rol: u.Rol.nombre_rol
        }));
        res.status(200).send(respuesta);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Obtiene un usuario específico por su ID.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await db.Usuario.findByPk(id, {
            attributes: { exclude: ['contraseña', 'rol_id'] },
            include: [{ model: db.Rol, attributes: ['nombre_rol'] }]
        });
        
        if (usuario) {
            // Se reestructura la respuesta para que sea consistente.
            const respuesta = {
                usuario_id: usuario.usuario_id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.Rol.nombre_rol
            };
            res.status(200).send(respuesta);
        } else {
            res.status(404).send({ message: `Usuario con id=${id} no encontrado.` });
        }
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Actualiza la información de un usuario (nombre y correo).
 * No permite actualizar el rol ni la contraseña desde este endpoint.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, correo } = req.body; 

        const [num] = await db.Usuario.update({ nombre, correo }, {
            where: { usuario_id: id }
        });

        if (num == 1) {
            res.send({ message: "Usuario actualizado exitosamente." });
        } else {
            res.status(404).send({ message: `No se pudo actualizar el usuario con id=${id}. Quizás no fue encontrado o no hubo cambios.` });
        }
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Elimina un usuario de la base de datos.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
// export const deleteUser = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const num = await db.Usuario.destroy({
//             where: { usuario_id: id }
//         });
        
//         if (num == 1) {
//             res.send({ message: "Usuario eliminado exitosamente." });
//         } else {
//             res.status(404).send({ message: `No se pudo eliminar el usuario con id=${id}.` });
//         }
//     } catch (error) {
//         res.status(500).send({ message: "Error al eliminar el usuario." });
//     }
// };


// activar delete delsde el backend
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const num = await db.Usuario.update(
            {
                is_deleted: 1,
                deleted_at: new Date()
            },
            {
                where: { usuario_id: id }
            }
        );

        if (num == 1) {
            res.send({ message: "Usuario eliminado (soft delete) exitosamente." });
        } else {
            res.status(404).send({ message: `No se pudo eliminar el usuario con id=${id}.` });
        }
    } catch (error) {
        res.status(500).send({ message: "Error al eliminar el usuario." });
    }
};