// =================================================================
// ARCHIVO: src/controllers/mesa.controller.js
// ROL: Controlador que maneja la lógica de negocio para las
//      operaciones CRUD de la entidad 'Mesa'.
// =================================================================

import db from '../models/index.js';
import { Op } from 'sequelize';
const Mesa = db.Mesa;

/**
 * Crea una nueva mesa en la base de datos.
 */
export const createMesa = async (req, res) => {
    try {
        const { numero_mesa, estado } = req.body;
        if (!numero_mesa) {
            return res.status(400).send({ message: "El número de mesa es requerido." });
        }
        const nuevaMesa = await Mesa.create({ numero_mesa, estado });
        res.status(201).send(nuevaMesa);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).send({ 
                message: 'Ya existe una mesa con ese número.' 
            });
        }
        res.status(500).send({ message: error.message });
    }
};

/**
 * Obtiene una lista de todas las mesas activas (no eliminadas).
 */
export const getAllMesas = async (req, res) => {
    try {
        const mesas = await Mesa.findAll({ 
            order: [['numero_mesa', 'ASC']] 
        });
        res.status(200).send(mesas);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

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

/**
 * Actualiza completamente una mesa.
 */
export const updateMesa = async (req, res) => {
    try {
        const { id } = req.params;
        const [num] = await Mesa.update(req.body, { 
            where: { mesa_id: id } 
        });
        
        if (num == 1) {
            res.send({ message: "Mesa actualizada exitosamente." });
        } else {
            res.status(404).send({ 
                message: `No se pudo actualizar la mesa con id=${id}.` 
            });
        }
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).send({ 
                message: 'Ya existe otra mesa con ese número.' 
            });
        }
        res.status(500).send({ message: error.message });
    }
};

/**
 * Actualiza el estado de una mesa específica.
 */
export const updateMesaEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        
        if (!estado) {
            return res.status(400).send({ 
                message: "El nuevo estado es requerido." 
            });
        }
        
        // Validar que el estado sea válido
        const estadosValidos = ['disponible', 'ocupada', 'limpieza', 'inactiva'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).send({ 
                message: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}` 
            });
        }
        
        const [num] = await Mesa.update(
            { estado: estado }, 
            { where: { mesa_id: id } }
        );
        
        if (num == 1) {
            res.send({ message: "Estado de la mesa actualizado exitosamente." });
        } else {
            res.status(404).send({ 
                message: `No se encontró la mesa con id=${id} o está eliminada.` 
            });
        }
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Marca una mesa específica como 'disponible'.
 */
export const markTableAsAvailable = async (req, res) => {
    try {
        const { id } = req.params;
        const [num] = await Mesa.update(
            { estado: 'disponible' }, 
            { where: { mesa_id: id } }
        );
        
        if (num == 1) {
            res.send({ message: "Mesa marcada como disponible." });
        } else {
            res.status(404).send({ 
                message: `No se encontró la mesa con id=${id}.` 
            });
        }
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Elimina una mesa (soft delete).
 * La mesa no se elimina físicamente, solo se marca como eliminada.
 */
export const deleteMesa = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Esto realizará un soft delete (establecerá deleted_at)
        const num = await Mesa.destroy({ 
            where: { mesa_id: id } 
        });
        
        if (num == 1) {
            res.send({ 
                message: "Mesa eliminada exitosamente." 
            });
        } else {
            res.status(404).send({ 
                message: `No se pudo eliminar la mesa con id=${id}.` 
            });
        }
    } catch (error) {
        res.status(500).send({ message: "Error al eliminar la mesa." });
    }
};

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