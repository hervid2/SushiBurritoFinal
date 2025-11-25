// =================================================================
// ARCHIVO: src/controllers/mesa.controller.js
// ROL: Controlador que maneja la lógica de negocio para las
//      operaciones CRUD de la entidad 'Mesa'.
// =================================================================

import db from '../models/index.js';
import { Op } from 'sequelize';
const Mesa = db.Mesa; // Se obtiene el modelo Mesa desde el objeto db.

/**
 * Crea una nueva mesa en la base de datos.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const createMesa = async (req, res) => {
    try {
        // Se extraen los datos del cuerpo de la petición.
        const { numero_mesa, estado } = req.body;
        // Se valida que el número de mesa sea proporcionado.
        if (!numero_mesa) {
            return res.status(400).send({ message: "El número de mesa es requerido." });
        }
        // Se crea el nuevo registro en la base de datos.
        const nuevaMesa = await Mesa.create({ numero_mesa, estado });
        // Se envía la nueva mesa creada con un estado 201 (Created).
        res.status(201).send(nuevaMesa);
    } catch (error) {
        // Manejo de errores generales del servidor.
        res.status(500).send({ message: error.message });
    }
};

/**
 * Obtiene una lista de todas las mesas, ordenadas por su número.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const getAllMesas = async (req, res) => {
    try {
        // Se obtienen todos los registros, ordenados ascendentemente por 'numero_mesa'.
        const mesas = await Mesa.findAll({ order: [['numero_mesa', 'ASC']] });
        // Se envía la lista de mesas con un estado 200 (OK).
        res.status(200).send(mesas);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// INICIO ACTUALIZACION PARA OBTERNER MESAS ELIMINADAS
/**
 * Obtiene todas las mesas, incluyendo las eliminadas.
 */
export const getAllMesasWithDeleted = async (req, res) => {
    try {
        const mesas = await Mesa.findAll({
            paranoid: false,
            order: [['numero_mesa', 'ASC']]
        });
        
        const mesasConEstado = mesas.map(mesa => ({
            ...mesa.toJSON(),
            esta_eliminada: mesa.deleted_at !== null
        }));
        
        res.status(200).send(mesasConEstado);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Obtiene solo las mesas eliminadas.
 */
export const getDeletedMesas = async (req, res) => {
    try {
        const mesasEliminadas = await Mesa.findAll({
            where: {
                deleted_at: { [Op.ne]: null }
            },
            paranoid: false,
            order: [['numero_mesa', 'ASC']]
        });
        res.status(200).send(mesasEliminadas);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Obtiene una mesa específica por su ID.
 */
export const getMesaById = async (req, res) => {
    try {
        const { id } = req.params;
        const mesa = await Mesa.findByPk(id);
        
        if (mesa) {
            res.status(200).send(mesa);
        } else {
            res.status(404).send({ 
                message: `Mesa con id=${id} no encontrada o ha sido eliminada.` 
            });
        }
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};
// FIN ACTUALIZACION PARA OPTENER MESAS ELIMINADAS
/**
 * Actualiza el estado de una mesa específica.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const updateMesaEstado = async (req, res) => {
    try {
        // Se obtiene el ID de la mesa de los parámetros de la URL.
        const { id } = req.params;
        // Se obtiene el nuevo estado del cuerpo de la petición.
        const { estado } = req.body;
        if (!estado) {
            return res.status(400).send({ message: "El nuevo estado es requerido." });
        }
        // Se actualiza el registro que coincida con el ID proporcionado.
        const [num] = await Mesa.update({ estado: estado }, { where: { mesa_id: id } });
        
        if (num == 1) {
            res.send({ message: "Estado de la mesa actualizado exitosamente." });
        } else {
            // Si no se actualizó ninguna fila, la mesa no fue encontrada.
            res.status(404).send({ message: `No se encontró la mesa con id=${id}.` });
        }
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Marca una mesa específica como 'disponible'.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const markTableAsAvailable = async (req, res) => {
    try {
        const { id } = req.params;
        // Se actualiza el estado de la mesa a 'disponible'.
        const [num] = await Mesa.update({ estado: 'disponible' }, { where: { mesa_id: id } });
        
        if (num == 1) {
            res.send({ message: "Mesa marcada como disponible." });
        } else {
            res.status(404).send({ message: `No se encontró la mesa con id=${id}.` });
        }
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Elimina una mesa de la base de datos.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 * La mesa no se elimina físicamente, solo se marca como eliminada.
 */
export const deleteMesa = async (req, res) => {
    try {
        const { id } = req.params;
        // Se elimina el registro que coincida con el ID proporcionado.
        const num = await Mesa.destroy({ where: { mesa_id: id } });
        
        if (num == 1) {
            res.send({ message: "Mesa eliminada exitosamente." });
        } else {
            // Si no se eliminó ninguna fila, la mesa no fue encontrada.
            res.status(404).send({ message: `No se pudo eliminar la mesa con id=${id}.` });
        }
    } catch (error) {
        res.status(500).send({ message: "Error al eliminar la mesa." });
    }
};

// CAMBIO DE RESTAURAR MESAS ELIMINADAS
/**
 * Restaura una mesa previamente eliminada.
 */
export const restoreMesa = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si la mesa existe y está eliminada
        const mesa = await Mesa.findByPk(id, { paranoid: false });
        
        if (!mesa) {
            return res.status(404).send({ 
                message: `Mesa con id=${id} no encontrada.` 
            });
        }
        
        if (!mesa.deleted_at) {
            return res.status(400).send({ 
                message: 'La mesa no está eliminada.' 
            });
        }
        
        // Restaurar la mesa
        await Mesa.restore({ where: { mesa_id: id } });
        
        res.send({ 
            message: "Mesa restaurada exitosamente.",
            mesa: await Mesa.findByPk(id)
        });
    } catch (error) {
        res.status(500).send({ message: "Error al restaurar la mesa." });
    }
};

/**
 * Elimina permanentemente una mesa (hard delete).
 * ADVERTENCIA: Esta acción es irreversible.
 */
export const permanentDeleteMesa = async (req, res) => {
    try {
        const { id } = req.params;
        
        // force: true realiza una eliminación física permanente
        const num = await Mesa.destroy({ 
            where: { mesa_id: id },
            force: true
        });
        
        if (num == 1) {
            res.send({ 
                message: "Mesa eliminada permanentemente." 
            });
        } else {
            res.status(404).send({ 
                message: `No se pudo eliminar permanentemente la mesa con id=${id}.` 
            });
        }
    } catch (error) {
        res.status(500).send({ 
            message: "Error al eliminar permanentemente la mesa." 
        });
    }
};
// FIN DEL CAMBIO DE RESTAURAR MESAS ELIMINADAS