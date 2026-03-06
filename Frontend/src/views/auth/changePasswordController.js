// =================================================================
// ARCHIVO: src/views/auth/changePasswordController.js
// ROL: Gestiona la actualización de la contraseña temporal.
// =================================================================

import { api } from '../../helpers/solicitudes.js';
import { showAlert } from '../../helpers/alerts.js';
import { navigateTo } from '../../router/router.js';

export const changePasswordController = () => {
    const form = document.getElementById('change-password-form');
    // Recuperamos el ID que el Login guardó al detectar que era una clave temporal
    const userId = localStorage.getItem('temp_usuario_id');

    // Si no hay ID, el usuario entró aquí por error; lo mandamos al login
    if (!userId) {
        navigateTo('login');
        return;
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nuevaPassword = document.getElementById('new-password').value;
            const confirmarPassword = document.getElementById('confirm-password').value;

            // Validación básica de coincidencia
            if (nuevaPassword !== confirmarPassword) {
                showAlert('Las contraseñas no coinciden.', 'error');
                return;
            }

            // Validación de longitud mínima (opcional, pero recomendada)
            if (nuevaPassword.length < 6) {
                showAlert('La contraseña debe tener al menos 6 caracteres.', 'warning');
                return;
            }

            try {
                // Enviamos la petición al nuevo endpoint del backend
                await api.publicPost('auth/change-password', { 
                    usuario_id: userId, 
                    nuevaContraseña: nuevaPassword 
                });

                showAlert('Contraseña actualizada con éxito. Ya puedes iniciar sesión.', 'success');
                
                // Limpiamos el rastro temporal y redirigimos
                localStorage.removeItem('temp_usuario_id');
                navigateTo('login');

            } catch (error) {
                console.error("Error al cambiar contraseña:", error);
                showAlert(error.message || 'No se pudo actualizar la contraseña.', 'error');
            }
        });
    }
};