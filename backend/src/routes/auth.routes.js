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
   RECUPERACIÓN DE CONTRASEÑA
===================================================== */
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Ruta para cerrar sesión y revocar el refresh token actual.
// Acepta peticiones POST a /api/auth/logout.
router.post('/logout', authController.logout);

// Se exporta el router configurado para ser utilizado en app.js.
export default router;
