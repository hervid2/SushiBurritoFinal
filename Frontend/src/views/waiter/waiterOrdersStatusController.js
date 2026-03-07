// =================================================================
// ARCHIVO: src/views/waiter/waiterOrdersStatusController.js
// ROL: Controlador para la vista "Estado de Pedidos" del mesero.
//      Muestra una tabla con todos los pedidos del sistema y su
//      estado actual, permitiendo al mesero actuar sobre ellos.
// =================================================================

import { showAlert } from '../../helpers/alerts.js';
import { api } from '../../helpers/solicitudes.js';
import { connectSocket, getSocket } from '../../helpers/socketClient.js';

/**
 * Controlador principal para la vista de Estado de Pedidos.
 */
export const waiterOrdersStatusController = () => {
    // --- Referencias a Elementos del DOM ---
    const ordersStatusTableBody = document.getElementById('orders-status-table-body');
    const paginationContainer = document.getElementById('orders-status-pagination');
    const table = document.getElementById('orders-status-table');

    // --- Estado Local del Controlador ---
    const itemsPerPage = 10; // Número de pedidos a mostrar por página.
    let currentPage = 1; // Página actual de la tabla.
    let allOrdersData = []; // Almacenará la lista completa de todos los pedidos.

    /**
     * Carga todos los pedidos desde la API y renderiza la tabla.
     */
    const loadOrdersStatus = async () => { // Función para cargar los pedidos desde la API y renderizar la tabla.
        if (!ordersStatusTableBody) return;// Verifica si el cuerpo de la tabla está disponible antes de proceder.
        ordersStatusTableBody.innerHTML = `<tr><td colspan="7" class="loading-message">Cargando...</td></tr>`;
        paginationContainer.innerHTML = ''; // Limpia el contenedor de paginación antes de cargar los datos.
        try {
            // Se obtienen todos los pedidos sin filtrar por estado.
            allOrdersData = await api.get('pedidos'); // Llama a la API para obtener todos los pedidos.
            currentPage = 1; // Reinicia la página actual a 1 para mostrar los pedidos desde el inicio.
            renderOrdersStatusTable(); // Renderiza la tabla de estado de pedidos con los datos obtenidos.
        } catch (error) { // Maneja cualquier error que ocurra al intentar obtener los pedidos.
            ordersStatusTableBody.innerHTML = `<tr><td colspan="7" class="error-message">${error.message}</td></tr>`; // Muestra un mensaje de error en la tabla si falla la carga.
        }
    };

    /**
     * @description Inicia los listeners de Socket.IO para refrescar la tabla
     *              de estado de pedidos cuando existan cambios en tiempo real.
     * @returns {void}
     */
    const startRealtimeOrdersStatus = () => {
        const socket = getSocket() || connectSocket();
        if (!socket) return;

        socket.off('nuevo_pedido');
        socket.off('cambio_estado_pedido');
        socket.off('pedido_cancelado');

        const refrescarTabla = () => {
            loadOrdersStatus();
        };

        socket.on('nuevo_pedido', refrescarTabla);
        socket.on('cambio_estado_pedido', refrescarTabla);
        socket.on('pedido_cancelado', refrescarTabla);
    };

    /**
     * Maneja la acción de marcar un pedido como 'entregado'.
     * @param {number} orderId - El ID del pedido a actualizar.
     */
    const handleMarkAsDelivered = async (orderId) => { // Función para manejar la acción de marcar un pedido como entregado.
        try {
            await api.put(`pedidos/${orderId}/estado`, { estado: 'entregado' }); // Llama a la API para actualizar el estado del pedido a 'entregado'.
            showAlert('Pedido marcado como entregado.', 'success'); // Muestra una alerta de éxito al usuario indicando que el pedido ha sido marcado como entregado.
            loadOrdersStatus(); // Recarga la tabla para reflejar el cambio de estado.
        } catch (error) { // Maneja cualquier error que ocurra al intentar marcar el pedido como entregado.
            showAlert(error.message, 'error');
        }
    };
    
    /**
     * Renderiza la tabla de estado de pedidos con los datos de la página actual.
     */
    const renderOrdersStatusTable = () => {
        // Se asegura de que la cabecera de la tabla incluya la columna de acciones.
        table.querySelector('thead tr').innerHTML = `
            <th># Pedido</th>
            <th>Mesero/a</th>
            <th>Mesa</th>
            <th>Estado</th>
            <th>Creación</th>
            <th>Últ. Act.</th>
            <th>Acciones</th>
        `;

        const startIndex = (currentPage - 1) * itemsPerPage; // Calcula el índice de inicio para la paginación.
        const ordersToDisplay = allOrdersData.slice(startIndex, startIndex + itemsPerPage); // Obtiene los pedidos que se mostrarán en la página actual, basándose en el índice de inicio y el número de ítems por página.

        if (ordersToDisplay.length === 0) { // Si no hay pedidos para mostrar en la página actual, se muestra un mensaje vacío.
            ordersStatusTableBody.innerHTML = '<tr><td colspan="7" class="empty-message">No hay pedidos para mostrar.</td></tr>';
            return;
        }
        
        /**
         * Formatea una cadena de fecha a un formato localizado y legible.
         * @param {string} dateString - La fecha en formato ISO.
         * @returns {string} - La fecha formateada o 'N/A' si es inválida.
         */
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A'; // Si no hay fecha, retorna 'N/A'.
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }; // Define las opciones de formato para la fecha.
            return new Date(dateString).toLocaleDateString('es-CO', options); // Convierte la fecha a un formato localizado (español de Colombia) con las opciones definidas.
        };

        // Se genera el HTML para cada fila de la tabla.
        ordersStatusTableBody.innerHTML = ordersToDisplay.map(order => `
            <tr>
                <td>${order.pedido_id}</td>
                <td>${order.Usuario?.nombre || 'N/A'}</td>
                <td>${order.Mesa?.numero_mesa || 'N/A'}</td>
                <td><span class="status-badge status-badge--${order.estado}">${order.estado}</span></td>
                <td>${formatDate(order.fecha_creacion)}</td>
                <td>${formatDate(order.fecha_modificacion)}</td>
                <td class="table-actions">
                    ${
                        // Renderizado condicional del botón de acción.
                        order.estado === 'preparado' 
                        ? `<button class="btn btn--primary btn--small mark-delivered-btn" data-id="${order.pedido_id}">Marcar Entregado</button>`
                        : '---'
                    }
                </td>
            </tr>
        `).join(''); // Se une el array de filas en una sola cadena HTML para insertarlo en el cuerpo de la tabla.

        renderPagination(); // Llama a la función para renderizar los controles de paginación después de actualizar el cuerpo de la tabla.
    };

    /**
     * Renderiza los controles de paginación para la tabla.
     */
    const renderPagination = () => { // Función para renderizar los controles de paginación debajo de la tabla.
        if (!paginationContainer) return; // Verifica si el contenedor de paginación está disponible antes de proceder.
        const totalPages = Math.ceil(allOrdersData.length / itemsPerPage); // Calcula el número total de páginas necesarias para mostrar todos los pedidos, dividiendo el total de pedidos por el número de ítems por página y redondeando hacia arriba.
        paginationContainer.innerHTML = ''; // Limpia el contenedor de paginación antes de renderizar los nuevos botones.
        if (totalPages <= 1) return; // Si solo hay una página o menos, no se renderiza la paginación.

        let buttonsHTML = ''; // Se inicializa una cadena para almacenar el HTML de los botones de paginación.
        for (let i = 1; i <= totalPages; i++) { // Se itera desde 1 hasta el número total de páginas para crear un botón por cada página.
            buttonsHTML += `<li><button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button></li>`;
        }
        paginationContainer.innerHTML = `<ul>${buttonsHTML}</ul>`; // Se inserta el HTML de los botones de paginación en el contenedor, envolviéndolos en una lista desordenada.
        
        paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => { // Se agrega un evento de clic a cada botón de paginación.
            btn.addEventListener('click', () => { // Se define el evento de clic para cada botón de paginación.
                currentPage = parseInt(btn.dataset.page, 10); // Se actualiza la página actual al número de página del botón clickeado.
                renderOrdersStatusTable(); // Se vuelve a renderizar la tabla de estado de pedidos para mostrar los pedidos de la nueva página.
            });
        });
    };

    // --- Inicialización del Controlador ---
    const init = () => {
        // Se utiliza delegación de eventos para una gestión eficiente de los clics en los botones.
        ordersStatusTableBody.addEventListener('click', (e) => { // Se agrega un evento de clic al cuerpo de la tabla para manejar los clics en los botones dentro de las filas.
            if (e.target.matches('.mark-delivered-btn')) { // Si se clickeó en un botón de "Marcar Entregado", se maneja la acción de marcar el pedido como entregado.
                const orderId = e.target.dataset.id; // Se obtiene el ID del pedido desde el atributo data-id del botón clickeado.
                handleMarkAsDelivered(orderId); // Se llama a la función para marcar el pedido como entregado, pasando el ID del pedido.
            }
        });
        // Carga inicial de los datos al entrar a la vista.
        loadOrdersStatus();
        startRealtimeOrdersStatus();
    };

    init();
};
