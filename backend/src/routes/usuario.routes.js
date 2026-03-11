// =================================================================
// ARCHIVO: src/routes/usuario.routes.js
// =================================================================
import { Router } from 'express';
import * as usuarioController from '../controllers/usuario.controller.js';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';
import { validateUserCreation } from '../middleware/validation.middleware.js';

const router = Router();


router.post('/change-password', usuarioController.changePassword);

/* =====================================================
   RUTAS ADMIN ESPECIALES
===================================================== */

// Usuarios eliminados (soft delete)
router.get('/eliminados', [verifyToken, isAdmin], usuarioController.getDeletedUsers);

// Restaurar usuario
router.put('/:id/restore', [verifyToken, isAdmin], usuarioController.restoreUser);

// Eliminación definitiva (hard delete)
router.delete('/:id/force', [verifyToken, isAdmin], usuarioController.deleteUserPermanent);


/* =====================================================
   CREACIÓN DE USUARIO (GENERA CONTRASEÑA TEMPORAL)
===================================================== */

router.post('/',
  verifyToken,   // si quieres protegerlo solo para admin
  usuarioController.createUser
);



/* =====================================================
   LISTAR USUARIOS
===================================================== */

router.get('/', [verifyToken, isAdmin], usuarioController.getAllUsers);


/* =====================================================
   CAMBIAR CONTRASEÑA (PRIMER LOGIN)
===================================================== */

// 🔥 Este endpoint lo usa el usuario después de loguearse
router.post('/change-password', verifyToken, usuarioController.changePassword);


/* =====================================================
   RUTAS CON :id (SIEMPRE AL FINAL)
===================================================== */

router.get('/:id', [verifyToken, isAdmin], usuarioController.getUserById);

router.put('/:id', [verifyToken, isAdmin], usuarioController.updateUser);

router.delete('/:id', [verifyToken, isAdmin], usuarioController.deleteUser);

router.put('/:id/role', [verifyToken, isAdmin], usuarioController.updateUsuarioRol);


export default router;
