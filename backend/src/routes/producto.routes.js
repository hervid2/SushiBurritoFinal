// =================================================================
// ARCHIVO: src/routes/producto.routes.js
// =================================================================

import { Router } from 'express';
import * as productoController from '../controllers/producto.controller.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// --- Rutas para Productos ---

// Obtener todos los productos (público)
// 🔹 RUTAS ESPECÍFICAS PRIMERO

// Ver productos eliminados
router.get('/eliminados', [verifyToken, isAdmin], productoController.getDeletedProducts);

// Restaurar producto
router.put('/:id/restaurar', [verifyToken, isAdmin], productoController.restoreProduct);

// Hard Delete
router.delete('/:id/permanente', [verifyToken, isAdmin], productoController.deleteProductPermanent);


// 🔹 RUTAS GENERALES DESPUÉS

// Obtener todos
router.get('/', productoController.getAllProducts);

// Obtener por ID
router.get('/:id', productoController.getProductById);

// Crear producto
router.post('/', [verifyToken, isAdmin], productoController.createProduct);

// Actualizar producto
router.put('/:id', [verifyToken, isAdmin], productoController.updateProduct);

// Soft Delete
router.delete('/:id', [verifyToken, isAdmin], productoController.deleteProduct);

export default router;

