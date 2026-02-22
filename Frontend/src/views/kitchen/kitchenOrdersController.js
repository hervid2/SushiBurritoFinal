// =================================================================
// ARCHIVO: src/views/kitchen/kitchenOrdersController.js
// ROL: Controlador para la vista de la cocina.
//      Muestra los pedidos filtrados por estado (pendiente, en preparación, listo)
//      y permite al personal de cocina actualizar su estado.
// =================================================================

import { showAlert } from '../../helpers/alerts.js';
import { api } from '../../helpers/solicitudes.js';
import { connectSocket, getSocket } from '../../helpers/socketClient.js';

/**
 * Controlador principal para la vista de la cocina.
 * Es reutilizable para diferentes estados de pedido.
 * @param {object} params - Objeto proporcionado por el router que contiene
 * la información de la ruta, incluyendo el 'status' a mostrar.
 */
export const kitchenOrdersController = (params) => {
    // Se obtiene el estado de los pedidos a mostrar desde la configuración de la ruta.
    const currentStatus = params.routeInfo.status;
    
    // --- Referencias a Elementos del DOM ---
    const ordersListContainer = document.getElementById('orders-list');
    const paginationContainer = document.getElementById('pagination-container');

    // --- Estado Local del Controlador ---
    let allOrders = []; // Almacena la lista completa de pedidos para el estado actual.
    let currentPage = 1; // Página actual de la paginación.
    const itemsPerPage = 6; // Cantidad de pedidos a mostrar por página.

    // --- Lógica de la API ---

    /**
     * Carga los pedidos desde la API, filtrando por el estado actual.
     */
    const loadOrders = async () => {
        ordersListContainer.innerHTML = '<div class="loading-message">Cargando...</div>'; // Mensaje de carga inicial.
        try {
            // Se realiza una petición GET a la API, pasando el estado como un query param.
            allOrders = await api.get(`pedidos?estado=${currentStatus}`);
            currentPage = 1; // Resetea a la primera página cada vez que se cargan los datos.
            renderPage();
        } catch (error) {
            ordersListContainer.innerHTML = `<div class="error-message">${error.message}</div>`; // Muestra un mensaje de error si falla la carga.
        }
    };

    /**
     * @description Inicia los listeners de Socket.IO para refrescar la lista de pedidos
     *              en las diferentes subvistas de cocina (pendiente, en_preparacion, preparado).
     * @returns {void}
     */
    const startRealtimeKitchen = () => {
        const socket = getSocket() || connectSocket();
        if (!socket) return;

        socket.off('nuevo_pedido');
        socket.off('cambio_estado_pedido');
        socket.off('pedido_cancelado');

        const refrescarPedidos = () => {
            loadOrders();
        };

        socket.on('nuevo_pedido', refrescarPedidos);
        socket.on('cambio_estado_pedido', refrescarPedidos);
        socket.on('pedido_cancelado', refrescarPedidos);
    };

    /**
     * Actualiza el estado de un pedido en el backend.
     * @param {number} orderId - El ID del pedido a actualizar.
     * @param {string} newStatus - El nuevo estado para el pedido.
     */
    const handleUpdateStatus = async (orderId, newStatus) => { // Se recibe el ID del pedido y el nuevo estado.
        try {
            await api.put(`pedidos/${orderId}/estado`, { estado: newStatus }); // Se realiza una petición PUT a la API para actualizar el estado del pedido.
            showAlert(`Pedido #${orderId} actualizado a '${newStatus}'.`, 'success'); // Muestra un mensaje de éxito al usuario.
            // Se recargan los pedidos. El pedido actualizado ya no aparecerá en esta vista.
            loadOrders();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    // --- Lógica de Renderizado ---

    /**
     * Renderiza la página actual de tarjetas de pedido.
     */
    const renderPage = () => {
        if (!ordersListContainer) return; // Verifica que el contenedor de pedidos exista.

        const startIndex = (currentPage - 1) * itemsPerPage; // Calcula el índice de inicio para la paginación.
        const pageItems = allOrders.slice(startIndex, startIndex + itemsPerPage); // Obtiene los pedidos para la página actual.

        if (pageItems.length === 0) { // Si no hay pedidos para mostrar, se muestra un mensaje.
            ordersListContainer.innerHTML = `<div class="empty-message">No hay pedidos en estado '${currentStatus}'.</div>`;
        } else {
            const formatDate = (dateString) => new Date(dateString).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); // Formatea la fecha de creación del pedido a una cadena legible.
            
            ordersListContainer.innerHTML = pageItems.map(order => { // Mapea cada pedido a una tarjeta HTML.
                // Se genera el HTML para la lista de productos, incluyendo notas individuales.
                const productosHTML = Array.isArray(order.Productos) ? order.Productos.map(p => { // Itera sobre los productos del pedido.
                    const notaProducto = p.DetallePedido?.notas
                        ? `<p class="order-card__item-note">Nota: ${p.DetallePedido.notas}</p>`
                        : ''; // Si el producto tiene notas, se muestra debajo del nombre del producto.
                    return `
                        <li class="order-card__item">
                            <span>${p.DetallePedido?.cantidad || 0}x ${p.nombre_producto}</span>
                            ${notaProducto}
                        </li>
                    `;
                }).join('') : '<li>Error al cargar productos</li>'; // Si no hay productos, se muestra un mensaje de error.

                return `
                    <div class="order-card order-card--${order.estado}" data-order-id="${order.pedido_id}">
                        <div class="order-card__header">
                            <h3 class="order-card__id">Pedido #${order.pedido_id}</h3>
                            <span class="order-card__time">${formatDate(order.fecha_creacion)}</span>
                        </div>
                        <div class="order-card__body">
                            <p><strong>Mesa:</strong> ${order.Mesa?.numero_mesa || 'N/A'}</p>
                            <ul class="order-card__items">
                                ${productosHTML}
                            </ul>
                        </div>
                        <div class="order-card__actions">
                            ${order.estado === 'pendiente' ? `<button class="btn btn--primary start-preparing-btn" data-id="${order.pedido_id}">En Preparación</button>` : ''}
                            ${order.estado === 'en_preparacion' ? `<button class="btn btn--success mark-ready-btn" data-id="${order.pedido_id}">Marcar Listo</button>` : ''}
                        </div>
                    </div>
                `;
            }).join(''); // Se une todo el HTML generado para los pedidos en una sola cadena.
        }
        
        renderPagination();
        attachButtonListeners();
    };
    
    /**
     * Renderiza los controles de paginación.
     */
    const renderPagination = () => { // Verifica que el contenedor de paginación exista.
        if (!paginationContainer) return; // Si no hay pedidos, no se muestra la paginación.
        paginationContainer.innerHTML = ''; // Limpia el contenedor de paginación antes de renderizar.
        const totalPages = Math.ceil(allOrders.length / itemsPerPage); // Calcula el número total de páginas basado en la cantidad de pedidos y los elementos por página.
        if (totalPages <= 1) return;// Si solo hay una página, no se muestra la paginación.

        let buttonsHTML = ''; // Genera el HTML para los botones de paginación.
        for (let i = 1; i <= totalPages; i++) { // Itera desde la página 1 hasta la última.
            buttonsHTML += `<li><button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button></li>`; // Cada botón tiene una clase 'active' si es la página actual.
        }
        paginationContainer.innerHTML = `<ul>${buttonsHTML}</ul>`; // Inserta los botones de paginación en el contenedor.

        paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => { // Asigna un listener a cada botón de paginación.
            btn.addEventListener('click', () => { // Cuando se hace clic en un botón, se actualiza la página actual y se vuelve a renderizar.
                currentPage = parseInt(btn.dataset.page); // Se obtiene el número de página del atributo 'data-page'.
                renderPage(); // Se vuelve a renderizar la página con los pedidos correspondientes.
            });
        });
    };
    
    // --- Manejadores de Eventos ---
    /**
     * Asigna los listeners a los botones de acción de las tarjetas de pedido.
     */
    const attachButtonListeners = () => { // Asigna los listeners a los botones de acción de las tarjetas de pedido.
        ordersListContainer.querySelectorAll('.start-preparing-btn').forEach(b => b.onclick = (e) => handleUpdateStatus(e.currentTarget.dataset.id, 'en_preparacion')); // Asigna un listener a los botones de "En Preparación" para actualizar el estado del pedido.
        ordersListContainer.querySelectorAll('.mark-ready-btn').forEach(b => b.onclick = (e) => handleUpdateStatus(e.currentTarget.dataset.id, 'preparado')); // Asigna un listener a los botones de "Marcar Listo" para actualizar el estado del pedido.
    };
    
    // --- Inicialización ---
    // Carga los pedidos iniciales en cuanto se monta la vista.
    loadOrders();
    startRealtimeKitchen();
};
