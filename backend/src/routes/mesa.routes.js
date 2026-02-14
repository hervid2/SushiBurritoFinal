// =================================================================
// ARCHIVO: src/routes/mesa.routes.js
// =================================================================

import { Router } from 'express';
import * as mesaController from '../controllers/mesa.controller.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// --- Rutas Públicas ---
router.get('/', mesaController.getAllMesas);

// --- Rutas de Gestión Avanzada (Solo Administradores) ---
// ⚠️ IMPORTANTE: Estas DEBEN ir ANTES de las rutas con /:id
router.get('/admin/with-deleted', [verifyToken, isAdmin], mesaController.getAllMesasWithDeleted);
router.get('/admin/deleted', [verifyToken, isAdmin], mesaController.getDeletedMesas);

// --- Rutas con Parámetros Dinámicos ---
router.get('/:id', mesaController.getMesaById);
router.post('/:id/restore', [verifyToken, isAdmin], mesaController.restoreMesa);
router.put('/:id/estado', [verifyToken], mesaController.updateMesaEstado);
router.put('/:id/mark-as-available', [verifyToken], mesaController.markTableAsAvailable);
router.put('/:id', [verifyToken, isAdmin], mesaController.updateMesa);

// --- Rutas Protegidas (Solo Administradores) ---
router.post('/', [verifyToken, isAdmin], mesaController.createMesa);
router.delete('/:id', [verifyToken, isAdmin], mesaController.deleteMesa);
router.delete('/:id/permanent', [verifyToken, isAdmin], mesaController.permanentDeleteMesa);

export default router;