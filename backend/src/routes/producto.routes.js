// =================================================================
// ARCHIVO: src/routes/producto.routes.js
// =================================================================

import { Router } from 'express';
import * as productoController from '../controllers/producto.controller.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// --- Rutas para Productos ---

// Obtener todos los productos (público)
router.get('/', productoController.getAllProducts);

// Obtener un producto por ID (público)
router.get('/:id', productoController.getProductById);

// Crear un nuevo producto (protegido para admin)
router.post('/', [verifyToken, isAdmin], productoController.createProduct);

// Actualizar un producto (protegido para admin)
router.put('/:id', [verifyToken, isAdmin], productoController.updateProduct);

// Eliminar un producto (protegido para admin)
router.delete('/:id', [verifyToken, isAdmin], productoController.deleteProduct);

//restaurar prodcutos eliminados
//router.put('/productos/:id/restaurar', restoreProduct);


export default router;