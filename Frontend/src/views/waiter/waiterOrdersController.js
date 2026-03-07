// =================================================================
// ARCHIVO: src/views/waiter/waiterOrdersController.js
// ROL: Controlador para la vista principal del mesero. Gestiona la
//      visualización de mesas, y la creación y edición de pedidos.
//      Es uno de los controladores más complejos de la aplicación.
// =================================================================

import { showAlert } from '../../helpers/alerts.js';
import { api } from '../../helpers/solicitudes.js';
import { connectSocket, getSocket } from '../../helpers/socketClient.js';

/**
 * Controlador principal para la vista de Gestión de Pedidos del Mesero.
 */
export const waiterOrdersController = () => {
    // --- Referencias a Elementos del DOM ---
    const tablesGrid = document.getElementById('tables-grid');
    if (!tablesGrid) { // Si no se encuentra el contenedor de mesas, se muestra un error crítico.
        console.error("Error Crítico: El contenedor '#tables-grid' no fue encontrado.");
        return; 
    }
    const paginationContainer = document.getElementById('pagination-container');
    const orderModal = document.getElementById('order-modal');
    const orderModalTitle = document.getElementById('order-modal-title');
    const orderForm = document.getElementById('order-form');
    const orderIdInput = document.getElementById('order-id');
    const tableIdHiddenInput = document.getElementById('table-id-hidden');
    const orderStatusContainer = document.getElementById('order-status-container');
    const orderStatusDisplay = document.getElementById('order-status-display');
    const orderItemsList = document.getElementById('order-items-list');
    const modifyOrderBtn = document.getElementById('modify-order-btn');
    const addItemSection = document.getElementById('add-item-section');
    const categoryFilterSelect = document.getElementById('item-category-filter');
    const itemSelect = document.getElementById('item-select');
    const itemQuantityInput = document.getElementById('item-quantity');
    const itemNotesInput = document.getElementById('item-notes');
    const confirmAddItemBtn = document.getElementById('confirm-add-item-btn');
    const submitOrderBtn = document.getElementById('submit-order-btn');
    const closeOrderModalBtn = document.querySelector('#order-modal .modal__close-btn');
    const cancelOrderModalBtn = document.getElementById('cancel-order-modal-btn');
    const addItemControls = document.getElementById('add-item-controls');
    const orderTotalPriceSpan = document.getElementById('order-total-price');

    // --- Estado Local del Controlador ---
    let allTables = [], allMenuItems = [], allCategories = [], currentOrderItems = []; // Almacena los datos de mesas, ítems del menú y categorías.
    let currentPage = 1;// Página actual para la paginación de mesas.
    const itemsPerPage = 6;// Número de mesas a mostrar por página en la cuadrícula.
            
    // --- Lógica de Carga de Datos ---
    /**
     * Carga todos los datos iniciales necesarios para la vista desde la API.
     * Procesa los datos para determinar el estado real de cada mesa.
     */
    const loadInitialData = async () => {
        tablesGrid.innerHTML = '<div class="loading-message">Cargando...</div>';
        try {
            // Se obtienen todos los datos necesarios en paralelo para mayor eficiencia.
            const [tablesData, allOrders, menuData, categoriesData] = await Promise.all([
                api.get('mesas'),
                api.get('pedidos'), // Se obtienen TODOS los pedidos para determinar el estado de las mesas.
                api.get('productos'),
                api.get('categorias')
            ]);
            
            // Se crea un mapa para encontrar eficientemente el último pedido de cada mesa.
            const latestOrderForTable = new Map();
            allOrders.forEach(order => {  // Se itera sobre todos los pedidos para encontrar el más reciente por mesa.
                if (!latestOrderForTable.has(order.mesa_id) || new Date(order.fecha_creacion) > new Date(latestOrderForTable.get(order.mesa_id).fecha_creacion)) { // Se compara la fecha de creación para determinar el más reciente.
                    latestOrderForTable.set(order.mesa_id, order); // Se guarda el pedido más reciente para cada mesa.
                }
            });
            
            // Se procesan las mesas para determinar su estado visual final.
            allTables = tablesData.map(table => {  // Se mapea cada mesa para ajustar su estado visual.
                const orderInfo = latestOrderForTable.get(table.mesa_id); // Se obtiene el último pedido de la mesa actual.
                let finalState = table.estado; // Se inicia con el estado original de la mesa.
                let pedidoIdToShow = null; // Se inicializa el ID del pedido a mostrar como nulo.

                if (table.estado === 'ocupada' && orderInfo) { // Si la mesa está ocupada, se verifica el último pedido.
                    pedidoIdToShow = orderInfo.pedido_id;// Se guarda el ID del último pedido.
                    // Si el último pedido de una mesa ocupada ya fue pagado, su estado visual debe ser 'limpieza'.
                    if (orderInfo.estado === 'pagado' || orderInfo.estado === 'cancelado') { // Si el pedido fue pagado o cancelado, se cambia el estado visual a 'limpieza'.
                        finalState = 'limpieza';// Se cambia el estado visual a 'limpieza' para indicar que la mesa necesita ser limpiada.
                    }
                }
                
                return { ...table, estado: finalState, pedido_id: pedidoIdToShow }; // Se retorna la mesa con su estado visual actualizado y el ID del pedido si corresponde.
            });

            allMenuItems = menuData;
            allCategories = categoriesData;
            
            populateCategoryFilter();
            populateItemSelect();
            currentPage = 1;
            renderPage(); // Se renderiza la cuadrícula de mesas con los datos cargados.
        } catch (error) {
            console.error(error);
            tablesGrid.innerHTML = '<div class="error-message">Error al cargar datos.</div>';
        }
    };

    /**
     * @description Inicia los listeners de Socket.IO para refrescar la información
     *              de mesas/pedidos cuando existan cambios en tiempo real.
     * @returns {void}
     */
    const startRealtimeWaiterOrders = () => {
        const socket = getSocket() || connectSocket();
        if (!socket) return;

        socket.off('nuevo_pedido');
        socket.off('cambio_estado_pedido');
        socket.off('pedido_cancelado');
        socket.off('mesa_actualizada');

        const refrescar = () => {
            loadInitialData();
        };

        socket.on('nuevo_pedido', refrescar);
        socket.on('cambio_estado_pedido', refrescar);
        socket.on('pedido_cancelado', refrescar);
        socket.on('mesa_actualizada', refrescar);
    };

    // --- Lógica de Renderizado ---
    const renderPagination = () => {
        if (!paginationContainer) return; // Si no hay contenedor de paginación, no se renderiza nada.
        paginationContainer.innerHTML = ''; // Se limpia el contenedor de paginación antes de renderizar nuevos botones.
        const totalPages = Math.ceil(allTables.length / itemsPerPage); // Se calcula el número total de páginas basado en la cantidad de mesas y los ítems por página.
        if (totalPages <= 1) return; // Si solo hay una página o menos, no se renderiza la paginación.

        let buttonsHTML = ''; // Se inicializa una cadena para almacenar los botones de paginación.
        for (let i = 1; i <= totalPages; i++) { // Se itera desde la página 1 hasta el total de páginas.
            buttonsHTML += `<li><button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button></li>`;
        }
        paginationContainer.innerHTML = `<ul>${buttonsHTML}</ul>`; // Se inserta el HTML de los botones de paginación en el contenedor.

        paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => { // Se agrega un evento de clic a cada botón de paginación.
            btn.addEventListener('click', () => { // Al hacer clic en un botón de paginación, se actualiza la página actual y se vuelve a renderizar la cuadrícula de mesas.
                currentPage = parseInt(btn.dataset.page); // Se obtiene el número de página del botón clickeado.
                renderPage(); // Se vuelve a renderizar la cuadrícula de mesas con la nueva página.
            });
        });
    };

    /**
     * Renderiza la cuadrícula de tarjetas de mesa.
     */
    const renderPage = () => {
        const startIndex = (currentPage - 1) * itemsPerPage; // Se calcula el índice de inicio para la paginación.
        const pageTables = allTables.slice(startIndex, startIndex + itemsPerPage); // Se obtiene la porción de mesas que corresponde a la página actual.
        tablesGrid.innerHTML = pageTables.map(table => `
            <div class="table-card table-card--${table.estado}" data-table-id="${table.mesa_id}">
                <div class="table-card__header"><h3 class="table-card__name">Mesa ${table.numero_mesa}</h3></div>
                <div class="table-card__body">
                    <p class="table-card__info"><strong>Estado:</strong> ${table.estado}</p>
                    ${table.pedido_id ? `<p class="table-card__info"><strong>Pedido:</strong> #${table.pedido_id}</p>` : ''}
                </div>
                <div class="table-card__actions">
                    ${table.estado === 'disponible' ? `<button class="btn btn--primary open-order-btn" data-table-id="${table.mesa_id}" data-table-name="Mesa ${table.numero_mesa}">Nuevo Pedido</button>` : ''}
                    ${table.estado === 'ocupada' && table.pedido_id ? `<button class="btn btn--info view-order-btn" data-order-id="${table.pedido_id}">Ver/Editar Pedido</button>` : ''}
                    ${table.estado === 'limpieza' ? `<button class="btn btn--secondary mark-clean-btn" data-table-id="${table.mesa_id}">Marcar como Limpia</button>` : ''}
                </div>
            </div>
        `).join(''); // Se renderiza cada mesa como una tarjeta con su estado y acciones disponibles.
        renderPagination(); // Se renderiza la paginación después de renderizar las mesas.
    };

    /**
     * Renderiza la lista de ítems dentro del modal de pedido y calcula el total.
     */
    const renderOrderItems = () => { // Se renderiza la lista de ítems del pedido actual y se calcula el total.
        let total = 0; // Se inicializa el total del pedido a 0.
        if (currentOrderItems.length > 0) { // Si hay ítems en el pedido actual, se renderiza la lista de ítems.
            orderItemsList.innerHTML = currentOrderItems.map((item, index) => { // Se itera sobre cada ítem del pedido actual.
                const subtotal = item.valor_neto * item.cantidad; // Se calcula el subtotal del ítem multiplicando su valor neto por la cantidad.
                total += subtotal; // Se suma el subtotal al total del pedido.
                return `
                    <div class="order-item-entry">
                        <div class="order-item-details">
                            <span>${item.cantidad}x ${item.nombre_producto}</span>
                            ${item.notas ? `<em class="order-item-notes">(${item.notas})</em>` : ''}
                        </div>
                        <div class="order-item-actions">
                            <span><strong>$${subtotal.toFixed(2)}</strong></span>
                            <button type="button" class="btn btn--danger btn--small delete-order-item-btn" data-index="${index}">X</button>
                        </div>
                    </div>
                `;
            }).join(''); // Se genera el HTML para cada ítem del pedido, mostrando la cantidad, nombre del producto, notas (si las hay) y el subtotal.
        } else {
            orderItemsList.innerHTML = '<p>Aún no hay artículos en este pedido.</p>'; // Si no hay ítems en el pedido, se muestra un mensaje indicando que aún no hay artículos.
        }
        orderTotalPriceSpan.textContent = `$${total.toFixed(2)}`; // Se actualiza el total del pedido en el modal, formateándolo a dos decimales.
    };

    const populateCategoryFilter = () => categoryFilterSelect.innerHTML = ['<option value="all">Todas</option>', ...allCategories.map(c => `<option value="${c.categoria_id}">${c.nombre}</option>`)].join(''); // Se llena el filtro de categorías con las categorías disponibles, incluyendo una opción para mostrar todos los ítems.
    
    const populateItemSelect = (categoryId = 'all') => { // Se llena el selector de ítems del menú según la categoría seleccionada.
        const items = categoryId === 'all' ? allMenuItems : allMenuItems.filter(i => i.categoria_id == categoryId); // Se filtran los ítems del menú según la categoría seleccionada, o se muestran todos si se selecciona "Todas".
        itemSelect.innerHTML = items.map(i => `<option value="${i.producto_id}">${i.nombre_producto} ($${parseFloat(i.valor_neto).toFixed(2)})</option>`).join(''); // Se llena el selector de ítems con los ítems filtrados, mostrando el nombre del producto y su valor neto formateado a dos decimales.
    };
    
    /**
     * Configura y abre el modal para crear o editar un pedido.
     * @param {object} config - Objeto de configuración para el modal.
     */
    const openOrderModal = (config) => { // Se configura y abre el modal de pedido con la configuración proporcionada.
        orderForm.reset(); // Se reinicia el formulario del modal para evitar datos residuales de pedidos anteriores.
        orderModalTitle.textContent = config.title; // Se establece el título del modal según la configuración proporcionada.
        orderIdInput.value = config.orderId || ''; // Se establece el ID del pedido en el campo oculto del formulario, si se proporciona.
        tableIdHiddenInput.value = config.tableId; // Se establece el ID de la mesa en el campo oculto del formulario.
        currentOrderItems = config.items || []; // Se inicializa la lista de ítems del pedido actual con los ítems proporcionados en la configuración, o se deja vacía si no se proporciona.
        renderOrderItems(); // Se renderiza la lista de ítems del pedido actual para mostrar los ítems en el modal.
        
        const isEditable = !config.status || config.status === 'pendiente'; // Se determina si el pedido es editable: si no tiene estado o si su estado es 'pendiente'.
        
        orderStatusContainer.style.display = config.status ? 'block' : 'none';// Se muestra el contenedor del estado del pedido solo si se proporciona un estado en la configuración.
        if (config.status) { // Si se proporciona un estado, se actualiza el texto y la clase del estado del pedido.
            orderStatusDisplay.textContent = `Estado: ${config.status}`; // Se establece el texto del estado del pedido en el modal.
            orderStatusDisplay.className = `order-status-display order-status--${config.status}`; // Se establece la clase del estado del pedido para aplicar estilos según el estado.
        }
        
        // Se ajusta la visibilidad de los controles según si el pedido es editable.
        modifyOrderBtn.style.display = 'none'; // Se oculta el botón "Agregar/Modificar"
        addItemSection.style.display = isEditable ? 'block' : 'none'; // Se muestra la sección para añadir si es editable
        submitOrderBtn.style.display = isEditable ? 'block' : 'none'; // Se muestra el botón de enviar pedido si es editable
        
        if (!isEditable && config.status) showAlert(`Este pedido no es editable (estado: ${config.status}).`, 'info'); // Se muestra una alerta informativa si el pedido no es editable.
        
        orderModal.classList.add('is-active'); // Se activa el modal para mostrarlo al usuario.
    };
    
    // --- Manejadores de Eventos ---
    const handleDeleteItemFromOrder = (itemIndex) => { // Se maneja la eliminación de un ítem del pedido actual.
        currentOrderItems.splice(itemIndex, 1); // Se elimina el ítem del pedido actual según el índice proporcionado.
        renderOrderItems(); // Se vuelve a renderizar la lista de ítems del pedido para reflejar los cambios.
    };

    const handleNewOrderClick = (tableId, tableName) => openOrderModal({ title: `Nuevo Pedido para ${tableName}`, tableId });// Se maneja el clic en el botón "Nuevo Pedido" para abrir el modal de pedido con la configuración adecuada.
    
    const handleViewOrderClick = async (orderId) => { // Se maneja el clic en el botón "Ver/Editar Pedido" para abrir el modal con los detalles del pedido.
        try {
            const order = await api.get(`pedidos/${orderId}`); // Se obtiene el pedido completo desde la API.
            const items = order.Productos.map(p => ({ // Se mapea cada producto del pedido para crear una lista de ítems con sus detalles.
                producto_id: p.producto_id,
                nombre_producto: p.nombre_producto,
                valor_neto: p.valor_neto,
                cantidad: p.DetallePedido.cantidad,
                notas: p.DetallePedido.notas,
            }));
            openOrderModal({ title: `Detalles del Pedido #${orderId}`, orderId: order.pedido_id, tableId: order.mesa_id, status: order.estado, items }); // Se abre el modal con los detalles del pedido, incluyendo el ID del pedido, el ID de la mesa, el estado del pedido y los ítems del pedido.
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };
    
    const handleMarkAsAvailable = async (tableId) => { // Se maneja el clic en el botón "Marcar como Limpia" para marcar una mesa como disponible nuevamente.
        try {
            await api.put(`mesas/${tableId}/mark-as-available`, {});// Se envía una solicitud PUT a la API para marcar la mesa como disponible.
            showAlert('Mesa disponible de nuevo.', 'success'); // Se muestra una alerta de éxito al usuario.
            loadInitialData(); // Se recargan los datos iniciales para reflejar el cambio en la cuadrícula de mesas.
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    const handleSaveOrder = async (e) => { // Se maneja el envío del formulario de pedido para crear o actualizar un pedido.
        e.preventDefault(); // Se previene el comportamiento por defecto del formulario para evitar recargas de página.
        const orderId = orderIdInput.value; // Se obtiene el ID del pedido del campo oculto del formulario.
        const tableId = tableIdHiddenInput.value; // Se obtiene el ID de la mesa del campo oculto del formulario.
        if (currentOrderItems.length === 0) { // Si no hay ítems en el pedido actual, se muestra una alerta y se detiene el proceso.
            showAlert('Debe añadir al menos un artículo al pedido.', 'warning'); // Se muestra una alerta de advertencia al usuario.
            return;
        }
        const orderData = { // Se prepara el objeto de datos del pedido para enviar a la API.
            mesa_id: tableId,
            items: currentOrderItems.map(item => ({ producto_id: item.producto_id, cantidad: item.cantidad, notas: item.notas }))
        }; // Se mapea cada ítem del pedido actual para crear un objeto con el ID del producto, la cantidad y las notas.
        try {
            if (orderId) {
                await api.put(`pedidos/${orderId}`, { items: orderData.items }); // Si hay un ID de pedido, se actualiza el pedido existente con los nuevos ítems.
                showAlert('Pedido actualizado correctamente.', 'success'); // Se muestra una alerta de éxito al usuario.
            } else {
                await api.post('pedidos', orderData); // Si no hay un ID de pedido, se crea un nuevo pedido con los ítems actuales.
                showAlert('Pedido creado correctamente.', 'success'); // Se muestra una alerta de éxito al usuario.
            }
            orderModal.classList.remove('is-active');// Se cierra el modal de pedido después de guardar los cambios.
            await loadInitialData(); // Se recargan los datos iniciales para reflejar el nuevo pedido en la cuadrícula de mesas.
        } catch(error) { 
            showAlert(error.message, 'error');
        }
    };
    
    // --- Inicialización ---
    const init = () => {
        // Se utiliza delegación de eventos para manejar los clics en la cuadrícula de mesas.
        tablesGrid.addEventListener('click', (e) => { // Se agrega un evento de clic al contenedor de mesas para manejar los clics en los botones dentro de las tarjetas de mesa.
            const target = e.target.closest('button'); // Se obtiene el botón más cercano al elemento clickeado para determinar qué acción se debe realizar.
            if (!target) return; // Si no se clickeó en un botón, no se hace nada.
            if (target.matches('.open-order-btn')) handleNewOrderClick(target.dataset.tableId, target.dataset.tableName); // Si se clickeó en el botón "Nuevo Pedido", se maneja la creación de un nuevo pedido para la mesa correspondiente.
            if (target.matches('.view-order-btn')) handleViewOrderClick(target.dataset.orderId); // Si se clickeó en el botón "Ver/Editar Pedido", se maneja la visualización del pedido correspondiente.
            if (target.matches('.mark-clean-btn')) handleMarkAsAvailable(target.dataset.tableId); // Si se clickeó en el botón "Marcar como Limpia", se maneja la acción de marcar la mesa como disponible nuevamente.
        });
        
        orderItemsList.addEventListener('click', (e) => { // Se agrega un evento de clic a la lista de ítems del pedido para manejar la eliminación de ítems.
            if (e.target.matches('.delete-order-item-btn')) { // Si se clickeó en el botón de eliminar un ítem del pedido, se maneja la eliminación del ítem correspondiente.
                handleDeleteItemFromOrder(parseInt(e.target.dataset.index, 10)); // Se obtiene el índice del ítem a eliminar desde el atributo data-index del botón clickeado.
            }
        });

        categoryFilterSelect.onchange = () => populateItemSelect(categoryFilterSelect.value); // Se agrega un evento onchange al filtro de categorías para actualizar el selector de ítems según la categoría seleccionada.

        confirmAddItemBtn.onclick = () => { // Se maneja el clic en el botón "Agregar Ítem" para añadir un ítem al pedido actual.
            const selectedItem = allMenuItems.find(i => i.producto_id == itemSelect.value); // Se busca el ítem seleccionado en el menú según el ID del producto seleccionado en el selector.
            if (selectedItem) { // Si se encontró el ítem seleccionado, se procede a añadirlo al pedido actual.
                currentOrderItems.push({ // Se crea un nuevo objeto para el ítem del pedido con los detalles del ítem seleccionado y la cantidad y notas ingresadas por el usuario.
                    producto_id: selectedItem.producto_id,
                    nombre_producto: selectedItem.nombre_producto,
                    valor_neto: selectedItem.valor_neto,
                    cantidad: itemQuantityInput.valueAsNumber,
                    notas: itemNotesInput.value,
                });// Se añade el nuevo ítem al pedido actual.
                renderOrderItems(); // Se renderiza la lista de ítems del pedido para mostrar el nuevo ítem añadido.
            }
            itemQuantityInput.value = 1;// Se reinicia el campo de cantidad a 1 para facilitar la adición de más ítems.
            itemNotesInput.value = ''; // Se reinicia el campo de notas a vacío para facilitar la adición de más ítems.
        };

        orderForm.onsubmit = handleSaveOrder;// Se agrega un evento onsubmit al formulario del modal de pedido para manejar el guardado del pedido cuando se envía el formulario.
        closeOrderModalBtn.onclick = () => orderModal.classList.remove('is-active'); // Se agrega un evento al botón de cerrar del modal para cerrar el modal cuando se hace clic en él.
        cancelOrderModalBtn.onclick = () => orderModal.classList.remove('is-active'); // Se agrega un evento al botón de cancelar del modal para cerrar el modal cuando se hace clic en él.

        loadInitialData(); // Se carga la información inicial de mesas, pedidos, ítems del menú y categorías al iniciar el controlador.
        startRealtimeWaiterOrders();
    };

    init(); // Se inicializa el controlador al cargar la vista, configurando eventos y cargando datos iniciales.
};
