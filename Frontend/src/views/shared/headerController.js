// =================================================================
// ARCHIVO: src/views/shared/headerController.js
// ROL: Controlador para el componente de encabezado (header).
//      Gestiona la lógica de la sesión del usuario, como mostrar
//      y dar funcionalidad al botón de "Cerrar Sesión".
// =================================================================

// Importa la función showAlert desde el módulo de alertas para mostrar mensajes al usuario.
import { showAlert } from "../../helpers/alerts.js";

/**
 * Controlador principal para el componente de encabezado.
 */
export const headerController = () => {
    // Se obtiene la referencia al botón de logout en el DOM.
    const logoutButton = document.getElementById('logout-button');
    
    // Se verifica el estado de autenticación del usuario desde localStorage.
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

    // Cláusula de guarda: si el botón no existe, se detiene la ejecución para evitar errores.
    if (!logoutButton) {
        console.error("El botón de logout no fue encontrado en el header.");
        return;
    }

    // Lógica condicional basada en el estado de autenticación.
    if (isAuthenticated) {
        // Si el usuario está autenticado, se muestra el botón.
        logoutButton.style.display = 'inline-block';

        // --- Técnica para prevenir event listeners duplicados ---
        // Se clona el botón para eliminar cualquier listener preexistente.
        // Esto es crucial porque esta lógica se puede ejecutar múltiples veces
        // al navegar entre vistas, y no queremos acumular listeners.
        const newLogoutButton = logoutButton.cloneNode(true); // Clona el botón actual.
        logoutButton.parentNode.replaceChild(newLogoutButton, logoutButton); // Reemplaza el botón original con el clonado.
        
        // Se añade un único event listener al nuevo botón clonado.
        newLogoutButton.addEventListener('click', () => {
            showAlert('Has cerrado sesión.', 'success');
            
            // Se eliminan todos los datos de la sesión del almacenamiento local.
            localStorage.removeItem('isAuthenticated');// Se elimina el estado de autenticación.
            localStorage.removeItem('userRole'); // Se elimina el rol del usuario.
            localStorage.removeItem('accessToken'); // Se elimina el token de acceso.
            
            // Se redirige y se recarga la aplicación para un reinicio de estado limpio y seguro.
            window.location.hash = '/login'; // Redirige al usuario a la página de inicio de sesión.
            window.location.reload(); // Recarga la página para aplicar los cambios de estado.
        });
    } else {
        // Si el usuario no está autenticado, se asegura de que el botón esté oculto.
        logoutButton.style.display = 'none';
    }
};

