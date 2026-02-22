// =================================================================
// ARCHIVO: src/controllers/pedido.controller.js
// ROL: Controlador que maneja toda la lógica de negocio para
//      las operaciones CRUD de la entidad 'Pedido'.
// =================================================================

import db from '../models/index.js';
import { emitNuevoPedido, emitCambioEstado, emitPedidoCancelado, emitMesaActualizada } from '../socket/events.js';

// Se desestructuran los modelos necesarios para un acceso más limpio.
const { Pedido, DetallePedido, Mesa, Producto, sequelize } = db;

/**
 * Crea un nuevo pedido, sus detalles asociados, y actualiza el estado de la mesa.
 * Toda la operación se ejecuta dentro de una transacción para garantizar la atomicidad.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const createPedido = async (req, res) => {
    // El ID del usuario (mesero) se obtiene del token verificado por el middleware.
    const usuario_id = req.userId;
    const { mesa_id, items } = req.body;

    if (!mesa_id || !items || items.length === 0) {
        return res.status(400).send({ message: "La mesa y al menos un artículo son requeridos." });
    }

    // Se inicia una transacción.
    const t = await sequelize.transaction();
    try {
        // 1. Se crea el registro del pedido.
        const pedido = await Pedido.create({
            usuario_id,
            mesa_id,
            estado: 'pendiente'
        }, { transaction: t });

        // Se prepara el array de detalles del pedido.
        const detallesPedido = items.map(item => ({
            pedido_id: pedido.pedido_id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            notas: item.notas
        }));
        // 2. Se insertan todos los detalles del pedido en una sola operación.
        await DetallePedido.bulkCreate(detallesPedido, { transaction: t });

        // 3. Se actualiza el estado de la mesa a 'ocupada'.
        await Mesa.update({ estado: 'ocupada' }, { where: { mesa_id: mesa_id }, transaction: t });

        // Si todas las operaciones son exitosas, se confirman los cambios.
        await t.commit();
        
        // Obtener el pedido completo con sus relaciones para notificación
        const pedidoCompleto = await Pedido.findByPk(pedido.pedido_id, {
            include: [
                { model: db.Usuario, attributes: ['nombre'] },
                { model: db.Mesa, attributes: ['numero_mesa'] }
            ]
        });
        
        // Emitir notificación en tiempo real via Socket.IO
        const io = req.app.get('io');
        if (io) {
            emitNuevoPedido(io, pedidoCompleto.toJSON());
        }
        
        res.status(201).send({ message: "Pedido creado exitosamente.", pedido });

    } catch (error) {
        // Si alguna operación falla, se revierten todos los cambios.
        await t.rollback();
        res.status(500).send({ message: "Error al crear el pedido: " + error.message });
    }
};


/**
 * Obtiene una lista de todos los pedidos, con la opción de filtrar por estado.
 * Incluye información detallada del usuario, mesa y productos asociados.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const getAllPedidos = async (req, res) => {
    try {
        // Se construye la cláusula 'where' para filtrar por estado si se proporciona.
        const whereClause = {};
        if (req.query.estado) {
            whereClause.estado = req.query.estado;
        }

        // Se obtienen los pedidos que coinciden con el filtro, ordenados por fecha.
        const pedidosBasicos = await db.Pedido.findAll({
            where: whereClause,
            order: [['fecha_creacion', 'DESC']],
        });

        if (!pedidosBasicos.length) {
            return res.status(200).send([]);
        }

        // Para cada pedido, se obtienen sus datos asociados en paralelo.
        const pedidosCompletos = await Promise.all(
            pedidosBasicos.map(async (pedido) => {
                const [usuario, mesa, productos] = await Promise.all([
                    pedido.getUsuario({ attributes: ['nombre'], required: false }),
                    pedido.getMesa({ attributes: ['numero_mesa'], required: false }),
                    pedido.getProductos({
                        attributes: ['nombre_producto', 'valor_neto'],
                        through: { attributes: ['cantidad', 'notas'] }
                    })
                ]);

                // Se ensambla el objeto de respuesta final.
                const pedidoJSON = pedido.toJSON();
                pedidoJSON.Usuario = usuario;
                pedidoJSON.Mesa = mesa;
                pedidoJSON.Productos = productos; 

                return pedidoJSON;
            })
        );
        res.status(200).send(pedidosCompletos);
    } catch (error) {
        console.error("Error en getAllPedidos:", error);
        res.status(500).send({ message: "Error al obtener los pedidos." });
    }
};



/**
 * Obtiene un pedido específico por su ID, incluyendo sus productos.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const getPedidoById = async (req, res) => {
    try {
        const { id } = req.params;
        // Se busca el pedido por su clave primaria e incluye los productos asociados.
        const pedido = await Pedido.findByPk(id, {
            include: [{
                model: Producto,
                through: { attributes: ['cantidad', 'notas'] }
            }]
        });
        if (pedido) {
            res.status(200).send(pedido);
        } else {
            res.status(404).send({ message: `Pedido con id=${id} no encontrado.` });
        }
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Actualiza el estado de un pedido específico.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const updatePedidoStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        
        // Obtener el pedido actual para conocer el estado anterior
        const pedidoActual = await Pedido.findByPk(id);
        if (!pedidoActual) {
            return res.status(404).send({ message: `No se encontró el pedido con id=${id}.` });
        }
        
        const estadoAnterior = pedidoActual.estado;
        
        // Actualizar el estado
        const [num] = await Pedido.update({ estado }, { where: { pedido_id: id } });
        
        if (num == 1) {
            // Obtener el pedido actualizado con sus relaciones para notificación
            const pedidoActualizado = await Pedido.findByPk(id, {
                include: [
                    { model: db.Usuario, attributes: ['nombre'] },
                    { model: db.Mesa, attributes: ['numero_mesa'] }
                ]
            });
            
            // Emitir notificación en tiempo real via Socket.IO
            const io = req.app.get('io');
            if (io) {
                emitCambioEstado(io, pedidoActualizado.toJSON(), estadoAnterior);
            }
            
            res.send({ message: "Estado del pedido actualizado exitosamente." });
        } else {
            res.status(404).send({ message: `No se encontró el pedido con id=${id}.` });
        }
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Actualiza la lista de ítems de un pedido existente.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const updatePedidoItems = async (req, res) => {
    const { id } = req.params;
    const { items } = req.body;
    const t = await sequelize.transaction();
    try {
        // 1. Se eliminan todos los detalles antiguos del pedido.
        await DetallePedido.destroy({ where: { pedido_id: id }, transaction: t });
        // Se prepara el array con los nuevos detalles.
        const nuevosDetalles = items.map(item => ({
            pedido_id: id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            notas: item.notas
        }));
        // 2. Se insertan los nuevos detalles.
        await DetallePedido.bulkCreate(nuevosDetalles, { transaction: t });
        await t.commit();
        res.status(200).send({ message: "Pedido actualizado exitosamente." });
    } catch (error) {
        await t.rollback();
        res.status(500).send({ message: "Error al actualizar el pedido: " + error.message });
    }
};

/**
 * Elimina un pedido y revierte el estado de la mesa a 'disponible'.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const deletePedido = async (req, res) => {
    const { id } = req.params;
    const t = await sequelize.transaction();
    try {
        const pedido = await Pedido.findByPk(id, { transaction: t });
        if (!pedido) {
            await t.rollback();
            return res.status(404).send({ message: "Pedido no encontrado." });
        }
        // Se libera la mesa asociada al pedido.
        await Mesa.update({ estado: 'disponible' }, { where: { mesa_id: pedido.mesa_id }, transaction: t });
        // Se elimina el pedido. La opción 'ON DELETE CASCADE' en la BD se encarga de los detalles.
        await Pedido.destroy({ where: { pedido_id: id }, transaction: t });
        
        // Obtener datos del pedido para notificación
        const pedidoParaNotificacion = {
            pedido_id: pedido.pedido_id,
            mesa_id: pedido.mesa_id,
            Mesa: await Mesa.findByPk(pedido.mesa_id, { attributes: ['numero_mesa'], transaction: t })
        };
        
        await t.commit();
        
        // Emitir notificación en tiempo real via Socket.IO
        const io = req.app.get('io');
        if (io) {
            emitPedidoCancelado(io, pedidoParaNotificacion);
        }
        
        res.status(200).send({ message: "Pedido cancelado y eliminado exitosamente." });
    } catch (error) {
        await t.rollback();
        res.status(500).send({ message: "Error al cancelar el pedido: " + error.message });
    }
};
