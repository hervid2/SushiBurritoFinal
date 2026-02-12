// =================================================================
// ARCHIVO: src/routes/usuario.routes.js
// =================================================================

import { Router } from 'express';
import * as usuarioController from '../controllers/usuario.controller.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';
import { validateUserCreation } from '../middleware/validation.middleware.js';

const router = Router();

// 🔹 RUTAS ESPECÍFICAS PRIMERO

router.get('/eliminados', [verifyToken, isAdmin], usuarioController.getDeletedUsers);

router.put('/:id/restore', [verifyToken, isAdmin], usuarioController.restoreUser);

router.delete('/:id/force', [verifyToken, isAdmin], usuarioController.deleteUserPermanent);


// 🔹 LUEGO LAS GENERALES

router.post('/', [verifyToken, isAdmin, validateUserCreation], usuarioController.createUser);

router.get('/', [verifyToken, isAdmin], usuarioController.getAllUsers);

router.get('/:id', [verifyToken, isAdmin], usuarioController.getUserById);

router.put('/:id', [verifyToken, isAdmin], usuarioController.updateUser);

router.delete('/:id', [verifyToken, isAdmin], usuarioController.deleteUser);

export default router;
