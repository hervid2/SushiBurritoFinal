// =================================================================
// ARCHIVO: src/controllers/producto.controller.js
// ROL: Controlador que maneja la lógica de negocio para las
//      operaciones CRUD de la entidad 'Producto'.
// =================================================================

import db from '../models/index.js';
const Producto = db.Producto;
const Categoria = db.Categoria;

/**
 * Crea un nuevo producto en la base de datos.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const createProduct = async (req, res) => {
    try {
        const { nombre_producto, descripcion_ingredientes, valor_neto, categoria_id } = req.body;

        if (!nombre_producto || !valor_neto || !categoria_id) {
            return res.status(400).json({
                message: "Nombre, valor y categoría son requeridos."
            });
        }

        //  Verificar si ya existe producto con mismo nombre y categoría
        const productoExistente = await Producto.findOne({
            where: {
                nombre_producto,
                categoria_id,
                is_deleted: 0
            }
        });

        if (productoExistente) {
            return res.status(400).json({
                message: "Ya existe un producto con ese nombre en esa categoría."
            });
        }

        // Crear producto si no existe
        const nuevoProducto = await Producto.create({
            nombre_producto,
            descripcion_ingredientes,
            valor_neto,
            categoria_id
        });

        res.status(201).json({
            message: "Producto creado exitosamente",
            data: nuevoProducto
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};



/**
 * Obtiene una lista de todos los productos, incluyendo el nombre de su categoría.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const getAllProducts = async (req, res) => {
    try {
        // Se obtienen todos los productos.
        const productos = await Producto.findAll({
            where: { is_deleted:0}, //Agregue esto 07/12/25

            // La opción 'include' realiza un JOIN con la tabla de categorías.
            include: [{
                model: Categoria,
                // 'attributes' limita las columnas que se traen del modelo incluido.
                attributes: ['nombre'] // Solo se incluye el nombre de la categoría.
            }]
        });
        res.status(200).send(productos);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Obtiene un producto específico por su ID, incluyendo su categoría.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const producto = await Producto.findOne({
            where: {
                producto_id: id,
                is_deleted: 0
            },
            include: [Categoria]
        });

        if (!producto) {
            return res.status(404).send({
                message: `Producto con id=${id} no encontrado.`
            });
        }

        res.status(200).send(producto);

    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};


/**
 * Actualiza un producto existente.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        // 'update' devuelve un array con el número de filas afectadas.
        const [num] = await Producto.update(req.body, { where: { producto_id: id } });
        if (num == 1) {
            res.send({ message: "Producto actualizado exitosamente." });
        } else {
            res.send({ message: `No se pudo actualizar el producto con id=${id}.` });
        }
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

/**
 * Elimina un producto de la base de datos.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 */

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const [num] = await Producto.update(
            { 
                is_deleted: 1,
                deleted_at: new Date()   // 👈 agrega esto
            },
            { 
                where: { producto_id: id, is_deleted: 0 } 
            }
        );

        if (num === 0) {
            return res.status(404).json({
                message: `No se encontró el producto con id=${id}`
            });
        }

        res.status(200).json({
            message: "Producto eliminado (soft delete) correctamente"
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};



//para restaurar los productos eliminados

export const restoreProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const [num] = await Producto.update(
            {
                is_deleted: 0,
                deleted_at: null
            },
            {
                where: { producto_id: id, is_deleted: 1 }
            }
        );

        if (num === 0) {
            return res.status(404).json({
                message: `No se encontró un producto eliminado con id=${id}`
            });
        }

        res.status(200).json({
            message: "Producto restaurado correctamente"
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};


export const deleteProductPermanent = async (req, res) => {
    try {
        const { id } = req.params;

        const num = await Producto.destroy({
            where: { producto_id: id },
            force : true
        });

        if (num === 0) {
            return res.status(404).json({
                message: `No se encontró el producto con id=${id}`
            });
        }

        res.status(200).json({
            message: "Producto eliminado permanentemente"
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

//ver producto eliminados
export const getDeletedProducts = async (req, res) => {
    try {
        const productos = await Producto.findAll({
            where: { is_deleted: 1 }
        });

        res.status(200).json(productos);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
