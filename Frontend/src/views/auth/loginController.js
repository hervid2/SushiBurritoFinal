// =================================================================
// ARCHIVO: src/views/auth/loginController.js
// ROL: Controlador para la vista de Inicio de Sesión.
//      Gestiona la autenticación del usuario, la comunicación con
//      la API de login y el establecimiento de la sesión en el cliente.
// =================================================================

import { showAlert } from '../../helpers/alerts.js';
import { navigateTo } from '../../router/router.js';
import { validateEmail } from '../../helpers/auth.js';
import { api } from '../../helpers/solicitudes.js'; // Se importa el helper de API centralizado.

/**
 * Controlador principal para la vista de Inicio de Sesión.
 */
export const loginController = () => {
    // --- Referencias a Elementos del DOM ---
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const submitButton = loginForm.querySelector('button[type="submit"]');

    /**
     * Maneja el evento de envío del formulario de login.
     * @param {Event} event - El objeto del evento de envío.
     */
    const handleLoginSubmit = async (event) => {
        event.preventDefault(); // Previene la recarga de la página por defecto.
        
        const email = emailInput.value;
        const password = passwordInput.value;

        // Validación de entradas en el lado del cliente.
        if (!validateEmail(email) || !password) {
            showAlert('Por favor, ingresa un correo y contraseña válidos.', 'warning');
            return;
        }

        // --- Feedback visual para el usuario ---
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner"></span> Entrando...`;

        try {
            // Se utiliza el helper 'api.publicPost' para la petición, manteniendo el código limpio.
            const result = await api.publicPost('auth/login', { 
                correo: email, 
                contraseña: password 
            });
            
            // --- Establecimiento de la Sesión en el Cliente ---
            // Si el login es exitoso, se guardan los datos de sesión en localStorage.
            localStorage.setItem('accessToken', result.accessToken);
            localStorage.setItem('userRole', result.rol);
            localStorage.setItem('isAuthenticated', 'true');

            showAlert('Inicio de sesión exitoso.', 'success');

            // --- Redirección Basada en el Rol ---
            // Se define un mapa de rutas de inicio para cada rol.
            const defaultRoutes = {
                administrador: '/admin/dashboard',
                mesero: '/waiter/orders',
                cocinero: '/kitchen/orders/pending'
            };
            
            // Se redirige al usuario a su página por defecto.
            navigateTo(defaultRoutes[result.rol] || '/');

        } catch (error) {
            // Si la API devuelve un error, se muestra en una alerta.
            showAlert(error.message || 'Error al iniciar sesión.', 'error');
        } finally {
            // Se restaura el estado del botón, tanto en caso de éxito como de error.
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    };

    // Asigna el manejador de eventos al formulario si este existe en el DOM.
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
};