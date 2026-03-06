// =================================================================
// ARCHIVO: src/routes/auth.routes.js
// ROL: Define los endpoints (rutas) específicos para la
//      autenticación y gestión de la sesión de usuarios.
// =================================================================
import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

/* =====================================================
   LOGIN
===================================================== */
router.post('/login', authController.login);

/* =====================================================
   REFRESH TOKEN
===================================================== */
router.post('/refresh-token', authController.refreshToken);

/* =====================================================
   CHANGE PASSWORD (NUEVA RUTA)
   Esta ruta recibe: usuario_id y nuevaContraseña
===================================================== */
router.post('/change-password', authController.changePassword);

export default router;
