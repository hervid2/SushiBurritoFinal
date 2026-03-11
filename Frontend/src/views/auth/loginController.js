// =================================================================
// ARCHIVO: src/views/auth/loginController.js
// ROL: Controlador para la vista de Inicio de Sesión.
//      Gestiona la autenticación del usuario, la comunicación con
//      la API de login y el establecimiento de la sesión en el cliente.
// =================================================================
import { showAlert } from '../../helpers/alerts.js';
import { navigateTo } from '../../router/router.js';
import { validateEmail } from '../../helpers/auth.js';
import { api } from '../../helpers/solicitudes.js'; 

export const loginController = () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const submitButton = loginForm.querySelector('button[type="submit"]');

    const handleLoginSubmit = async (event) => {
        event.preventDefault(); 
        
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!validateEmail(email) || !password) {
            showAlert('Por favor, ingresa un correo y contraseña válidos.', 'warning');
            return;
        }

        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner"></span> Entrando...`;

        try {
            const result = await api.publicPost('auth/login', { 
                correo: email, 
                contraseña: password 
            });
            
            // --- NUEVA LÓGICA: DETECCIÓN DE CONTRASEÑA TEMPORAL ---
            // Si el backend dice que debe cambiarla, no guardamos sesión aún.
            if (result.mustChangePassword) {
                localStorage.setItem('temp_usuario_id', result.usuario_id);
                showAlert(result.message, 'warning');
                navigateTo('change-password'); // Redirige a la nueva vista
                return; // Cortamos la ejecución aquí
            }

            // --- ESTABLECIMIENTO DE SESIÓN NORMAL ---
            localStorage.setItem('accessToken', result.accessToken);
            localStorage.setItem('userRole', result.rol);
            localStorage.setItem('isAuthenticated', 'true');

            showAlert('Inicio de sesión exitoso.', 'success');

            // Rutas corregidas (sin la "/" inicial para que el router las encuentre)
            const defaultRoutes = {
                administrador: 'admin/dashboard',
                mesero: 'waiter/orders',
                cocinero: 'kitchen/orders/pending'
            };
            
            navigateTo(defaultRoutes[result.rol] || 'login');

        } catch (error) {
            showAlert(error.message || 'Error al iniciar sesión.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    };

    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
};