// =================================================================
// ARCHIVO: src/routes/categoria.routes.js
// =================================================================

import { Router } from 'express';
import * as categoriaController from '../controllers/categoria.controller.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// --- Rutas Públicas ---

// Obtener todas las categorías activas (ruta pública para filtros)
router.get('/', categoriaController.getAllCategories);

// --- Rutas de Gestión Avanzada (Solo Administradores) ---
// ⚠️ IMPORTANTE: Estas DEBEN ir ANTES de las rutas con /:id

// Obtener todas las categorías incluyendo eliminadas
router.get('/admin/with-deleted', [verifyToken, isAdmin], categoriaController.getAllCategoriesWithDeleted);

// Obtener solo categorías eliminadas
router.get('/admin/deleted', [verifyToken, isAdmin], categoriaController.getDeletedCategories);

// --- Rutas con Parámetros Dinámicos ---
// ⚠️ Estas van DESPUÉS de las rutas específicas

// Obtener una categoría por ID (ruta pública)
router.get('/:id', categoriaController.getCategoryById);

// Restaurar una categoría eliminada
router.post('/:id/restore', [verifyToken, isAdmin], categoriaController.restoreCategory);

// --- Rutas Protegidas (Solo Administradores) ---

// Crear una nueva categoría
router.post('/', [verifyToken, isAdmin], categoriaController.createCategory);

// Actualizar una categoría existente
router.put('/:id', [verifyToken, isAdmin], categoriaController.updateCategory);

// Eliminar una categoría (soft delete)
router.delete('/:id', [verifyToken, isAdmin], categoriaController.deleteCategory);

// Eliminar permanentemente una categoría (usar con precaución)
router.delete('/:id/permanent', [verifyToken, isAdmin], categoriaController.permanentDeleteCategory);

export default router;