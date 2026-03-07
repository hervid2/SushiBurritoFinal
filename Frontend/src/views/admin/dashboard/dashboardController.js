// =================================================================
// ARCHIVO: src/views/admin/dashboard/dashboardController.js
// ROL: Controlador para la vista del Dashboard de Administración.
//      Se encarga de inicializar los componentes visuales y de
//      cargar los datos de resumen desde la API.
// =================================================================

import { showAlert } from '../../../helpers/alerts.js';
import { api } from '../../../helpers/solicitudes.js'; 
import { connectSocket, getSocket } from '../../../helpers/socketClient.js';

/**
 * Controlador principal para la vista del Dashboard.
 */
export const dashboardController = () => {
    
    // --- LÓGICA DEL CARRUSEL  ---
    let currentSlideIndex = 0;
    let slideTimeout; // Variable para guardar la referencia del temporizador.

    /**
     * Gestiona la lógica para mostrar la siguiente diapositiva con una transición suave.
     */
    const showNextSlide = () => {
        const slides = document.querySelectorAll(".carousel__slide"); // Selecciona todas las diapositivas del carrusel.
        if (slides.length < 2) return; // No hace falta animar si hay menos de 2 imágenes.

        // Oculta la diapositiva actual quitando la clase 'is-active'.
        slides[currentSlideIndex].classList.remove('is-active');
        
        // Calcula el índice de la siguiente diapositiva usando el operador módulo para un bucle limpio.
        currentSlideIndex = (currentSlideIndex + 1) % slides.length;
        
        // Muestra la nueva diapositiva añadiendo la clase 'is-active'.
        slides[currentSlideIndex].classList.add('is-active');
        
        // Vuelve a llamar a esta función después de 4 segundos.
        slideTimeout = setTimeout(showNextSlide, 4000);
    };

    // --- CARGA DE DATOS DESDE LA API (sin cambios) ---

    /**
     * Obtiene y renderiza las estadísticas de resumen del dashboard.
     */
    const loadDashboardData = async () => {
        try {
            const summaryData = await api.get('stats/dashboard-summary'); // Llama a la API para obtener los datos del resumen del dashboard
            document.getElementById('pending-orders-count').textContent = summaryData.pendingOrdersCount; // Actualiza el conteo de pedidos pendientes
            document.getElementById('registered-users-count').textContent = summaryData.registeredUsersCount; // Actualiza el conteo de usuarios registrados
            document.getElementById('daily-sales-amount').textContent = `$${summaryData.dailySalesAmount}`; // Actualiza el monto de ventas diarias
        } catch (error) {
            showAlert(error.message, 'error');
            console.error("Error al cargar los datos del dashboard:", error);
            document.getElementById('pending-orders-count').textContent = 'Error';
            document.getElementById('registered-users-count').textContent = 'Error';
            document.getElementById('daily-sales-amount').textContent = 'Error';
        }
    };

    /**
     * @description Renderiza la sección de "Actividad Reciente" usando la estructura
     *              de notificaciones emitidas por Socket.IO.
     * @param {HTMLElement} activityList - Elemento UL donde se renderizan los items.
     * @param {Array} items - Lista de notificaciones.
     * @returns {void}
     */
    const renderSocketActivity = (activityList, items) => {
        if (!activityList) return;

        if (!Array.isArray(items) || items.length === 0) {
            activityList.innerHTML = '<li>No hay actividad reciente para mostrar.</li>';
            return;
        }

        const formatearFecha = (dateString) => {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        };

        const dedupe = new Set();
        const uniqueItems = items.filter((n) => {
            const key = `${n?.type || ''}-${n?.data?.pedido_id || ''}-${n?.timestamp || ''}-${n?.message || ''}`;
            if (dedupe.has(key)) return false;
            dedupe.add(key);
            return true;
        });

        activityList.innerHTML = uniqueItems.slice(0, 6).map((n) => `
            <li><span class="activity-date">${formatearFecha(n.timestamp)}:</span> ${n.message || 'Evento'}</li>
        `).join('');
    };

    /**
     * @description Inicia los listeners de Socket.IO para mantener la UI de
     *              "Actividad Reciente" actualizada en tiempo real.
     * @returns {void}
     */
    const startRealtimeActivity = () => {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        const socket = getSocket() || connectSocket();
        if (!socket) return;

        socket.off('historial_dashboard');
        socket.off('actualizar_dashboard');

        socket.on('historial_dashboard', (payload) => {
            const items = Array.isArray(payload?.notifications) ? payload.notifications : [];
            renderSocketActivity(activityList, items);
        });

        socket.on('actualizar_dashboard', (nuevo) => {
            const existentes = Array.from(activityList.querySelectorAll('li')).map(li => li.outerHTML);
            const nuevoItem = {
                type: nuevo?.type,
                message: nuevo?.message,
                data: nuevo?.data,
                timestamp: nuevo?.timestamp,
            };

            const formatearFecha = (dateString) => {
                if (!dateString) return 'N/A';
                return new Date(dateString).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            };

            const nuevoLi = `<li><span class="activity-date">${formatearFecha(nuevoItem.timestamp)}:</span> ${nuevoItem.message || 'Evento'}</li>`;
            const html = [nuevoLi, ...existentes].slice(0, 6).join('');
            activityList.innerHTML = html;
        });

        socket.emit('obtener_historial');
    };
    
    /**
     * Obtiene y renderiza la lista de actividades recientes.
     */
    const loadRecentActivity = async () => {
        const activityList = document.getElementById('activity-list'); // Selecciona el elemento de la lista de actividades recientes
        try {
            const activities = await api.get('stats/recent-activity'); //   Llama a la API para obtener las actividades recientes
            
            if (activities.length === 0) { // Si no hay actividades recientes, muestra un mensaje adecuado.
                activityList.innerHTML = '<li>No hay actividad reciente para mostrar.</li>'; // Muestra un mensaje si no hay actividades recientes
                return;
            }

            const formatDate = (dateString) => {
                const date = new Date(dateString); // Convierte la cadena de fecha en un objeto Date
                return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }); // Formatea la fecha a un formato legible
            };

            activityList.innerHTML = activities.map(activity => `
                <li><span class="activity-date">${formatDate(activity.date)}:</span> ${activity.description}</li>
            `).join(''); // Mapea las actividades y las convierte en elementos de lista HTML

        } catch (error) {
            console.error("Error al cargar la actividad reciente:", error);
            activityList.innerHTML = '<li>Error al cargar la actividad.</li>';
        }
    };

    // --- INICIALIZACIÓN DEL CONTROLADOR ---

    /**
     * Función de inicialización que se ejecuta al cargar el controlador.
     */
    const init = () => {
        loadDashboardData(); // Carga los datos del dashboard al iniciar el controlador
        loadRecentActivity(); // Carga la actividad reciente al iniciar el controlador
        startRealtimeActivity();

        // Inicia el carrusel
        const slides = document.querySelectorAll(".carousel__slide"); // Selecciona todas las diapositivas del carrusel.
        if (slides.length > 0) { // Si hay diapositivas en el carrusel, inicia el ciclo de cambio de diapositivas.
            // Limpia cualquier temporizador previo para evitar duplicados si la vista se recarga.
            if (slideTimeout) clearTimeout(slideTimeout);
            
            currentSlideIndex = 0; // Se asegura de empezar por la primera diapositiva.
            slides[0].classList.add('is-active'); // Activa la primera diapositiva para que sea visible.
            
            // Inicia el ciclo de cambio de diapositivas.
            slideTimeout = setTimeout(showNextSlide, 4000);
        }
    };

    // Llama a la función de inicialización para arrancar el controlador.
    init();
};
