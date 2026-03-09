import { api } from '../../helpers/solicitudes.js';
import { showAlert } from '../../helpers/alerts.js';
import { navigateTo } from '../../router/router.js';

export const changePasswordController = () => {
    const form = document.getElementById('change-password-form');
    const userId = localStorage.getItem('temp_usuario_id');

    if (!userId) {
        navigateTo('login');
        return;
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nuevaPassword = document.getElementById('new-password').value;
            const confirmarPassword = document.getElementById('confirm-password').value;

            if (nuevaPassword !== confirmarPassword) {
                showAlert('Las contraseñas no coinciden.', 'error');
                return;
            }

            if (nuevaPassword.length < 8) {
                showAlert('La contraseña debe tener al menos 8 caracteres.', 'warning');
                return;
            }

            try {
                // 🚀 Pegamos a la ruta de usuarios que NO tiene verifyToken
                await api.publicPost('usuarios/change-password', { 
                    usuario_id: userId, 
                    nuevaContraseña: nuevaPassword 
                });

                showAlert('Contraseña actualizada. Ya puedes iniciar sesión.', 'success');
                localStorage.removeItem('temp_usuario_id');
                navigateTo('login');
            } catch (error) {
                console.error("Error:", error);
                showAlert(error.message || 'No se pudo actualizar.', 'error');
            }
        });
    }
};