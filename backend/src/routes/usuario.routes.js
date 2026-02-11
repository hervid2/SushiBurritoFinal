// =================================================================
// ARCHIVO: src/routes/usuario.routes.js
// =================================================================

import { Router } from 'express';
import * as usuarioController from '../controllers/usuario.controller.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';
import { validateUserCreation } from '../middleware/validation.middleware.js';

const router = Router();

// Ruta del middleware de validación
router.post('/', [verifyToken, isAdmin, validateUserCreation], usuarioController.createUser);

// Todas las rutas están protegidas y solo accesibles por un admin
router.post('/', [verifyToken, isAdmin], usuarioController.createUser);
router.get('/', [verifyToken, isAdmin], usuarioController.getAllUsers);
router.get('/:id', [verifyToken, isAdmin], usuarioController.getUserById);
router.put('/:id', [verifyToken, isAdmin], usuarioController.updateUser);
router.delete('/:id', [verifyToken, isAdmin], usuarioController.deleteUser);
router.put('/:id/restore',[verifyToken, isAdmin], usuarioController.restoreUser);
router.delete('/:id/force', [verifyToken, isAdmin], usuarioController.deleteUserPermanent);



export default router;