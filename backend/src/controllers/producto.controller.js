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
        // Se extraen los datos del producto del cuerpo de la petición.
        const { nombre_producto, descripcion_ingredientes, valor_neto, categoria_id } = req.body;
        // Validación básica de los campos requeridos.
        if (!nombre_producto || !valor_neto || !categoria_id) {
            return res.status(400).send({ message: "Nombre, valor y categoría son requeridos." });
        }
        // Se crea el nuevo producto en la base de datos.
        const nuevoProducto = await Producto.create({ nombre_producto, descripcion_ingredientes, valor_neto, categoria_id });
        // Se envía el producto recién creado con un estado 201 (Created).
        res.status(201).send(nuevoProducto);
    } catch (error) {
        res.status(500).send({ message: error.message });
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
        // Se busca un producto por su clave primaria e incluye toda la información de la categoría.
        const producto = await Producto.findByPk(id, { include: [Categoria] });
        if (producto) {
            res.status(200).send(producto);
        } else {
            res.status(404).send({ message: `Producto con id=${id} no encontrado.` });
        }
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
// export const deleteProduct = async (req, res) => {
//     try {
//         const { id } = req.params;
//         // 'destroy' devuelve el número de filas eliminadas.
//         const num = await Producto.destroy({ where: { producto_id: id } });
//         if (num == 1) {
//             res.send({ message: "Producto eliminado exitosamente." });
//         } else {
//             res.send({ message: `No se pudo eliminar el producto con id=${id}.` });
//         }
//     } catch (error) {
//         res.status(500).send({ message: "Error al eliminar el producto." });
//     }
// };

// activar delete delsde el backend
// export const deleteProduct = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const num = await db.Producto.update(
//             {
//                 is_deleted: 1,
//                 deleted_at: new Date()
//             },
//             {
//                 where: { producto_id: id }
//             }
//         );

//         if (num == 1) {
//             res.send({ message: "Producto eliminado (soft delete) exitosamente." });
//         } else {
//             res.status(404).send({ message: `No se pudo eliminar el Producto con id=${id}.` });
//         }
//     } catch (error) {
//         res.status(500).send({ message: "Error al eliminar el Producto." });
//     }
// };

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        await Producto.destroy({
            where: { producto_id: id }
        });

        res.status(200).json({ message: 'Producto eliminado correctamente' });

    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar producto' });
    }
};


//para restaurar los productos eliminados

// export const restoreProduct = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const restored = await Producto.restore({
//             where: { producto_id: id }
//         });

//         if (restored === 0) {
//             return res.status(404).json({
//                 message: `No se pudo restaurar el producto con id=${id}`
//             });
//         }

//         res.status(200).json({
//             message: `Producto con id=${id} restaurado correctamente`
//         });

//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };
