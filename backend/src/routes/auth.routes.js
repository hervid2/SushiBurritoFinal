// =================================================================
// ARCHIVO: src/routes/auth.routes.js
// ROL: Define los endpoints (rutas) específicos para la
//      autenticación y gestión de la sesión de usuarios.
// =================================================================

// Se importa el constructor Router de Express para crear un enrutador modular.
import { Router } from 'express';
// Se importa el controlador de autenticación que contiene la lógica de negocio.
import * as authController from '../controllers/auth.controller.js';

// Se crea una nueva instancia del enrutador.
const router = Router();

// --- Definición de Rutas de Autenticación ---

// Ruta para el inicio de sesión de un usuario.
// Acepta peticiones POST a /api/auth/login.
router.post('/login', authController.login);

// Ruta para solicitar un enlace de restablecimiento de contraseña.
// Acepta peticiones POST a /api/auth/forgot-password.
router.post('/forgot-password', authController.forgotPassword);

// Ruta para establecer una nueva contraseña utilizando un token.
// Acepta peticiones POST a /api/auth/reset-password.
router.post('/reset-password', authController.resetPassword);

// Ruta para obtener un nuevo accessToken utilizando un refreshToken.
// Acepta peticiones POST a /api/auth/refresh-token.
router.post('/refresh-token', authController.refreshToken);

// Ruta para cerrar sesión y revocar el refresh token actual.
// Acepta peticiones POST a /api/auth/logout.
router.post('/logout', authController.logout);

// Se exporta el router configurado para ser utilizado en app.js.
export default router;
