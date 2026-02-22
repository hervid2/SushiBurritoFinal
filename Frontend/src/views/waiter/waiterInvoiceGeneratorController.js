// =================================================================
// ARCHIVO: src/views/waiter/waiterInvoiceGeneratorController.js
// ROL: Controlador para la vista "Generación de Factura" del mesero.
//      Funciona como un asistente paso a paso para seleccionar un pedido,
//      editar sus detalles para la facturación y generar la factura final.
// =================================================================

import { showAlert } from '../../helpers/alerts.js';
import { showConfirmModal } from '../../helpers/modalHelper.js';
import { api } from '../../helpers/solicitudes.js';
import { validateEmail } from '../../helpers/auth.js';
import { connectSocket, getSocket } from '../../helpers/socketClient.js';

/**
 * Controlador principal para la vista de Generación de Factura.
 */
export const waiterInvoiceGeneratorController = () => {
    // --- Referencias a todos los Elementos del DOM ---
    const selectOrder = document.getElementById('select-order-for-invoice'), loadBtn = document.getElementById('load-invoice-details-btn');
    const detailsSection = document.getElementById('invoice-details-section'), tableBody = document.getElementById('invoice-items-table-body');
    const summarySubtotal = document.getElementById('summary-subtotal'), summaryTax = document.getElementById('summary-tax'), tipInput = document.getElementById('tip-amount'), summaryTotal = document.getElementById('summary-total');
    const paymentMethodSelect = document.getElementById('payment-method');
    const finalizeBtn = document.getElementById('finalize-invoice-btn'), finalInvoiceSection = document.getElementById('final-invoice-section'), finalInvoiceContent = document.getElementById('final-invoice-content'), finalInvoiceTitle = document.getElementById('final-invoice-title');
    const voidInvoiceBtn = document.getElementById('void-invoice-btn'), sendEmailBtn = document.getElementById('send-email-btn');
    const sendEmailModal = document.getElementById('send-email-modal'), sendEmailForm = document.getElementById('send-email-form'), emailInput = document.getElementById('email-input'), cancelEmailBtn = document.getElementById('cancel-email-btn');
    const sendEmailSubmitBtn = document.getElementById('send-email-submit-btn');
    const editItemModal = document.getElementById('edit-item-modal'), editItemForm = document.getElementById('edit-item-form'), editItemName = document.getElementById('edit-item-name');
    const editItemQuantity = document.getElementById('edit-item-quantity'), cancelEditBtn = document.getElementById('cancel-edit-btn'), saveEditBtn = document.getElementById('save-edit-btn');
    const addItemModal = document.getElementById('add-item-modal'), addItemForm = document.getElementById('add-item-form'), addItemProduct = document.getElementById('add-item-product');
    const addItemQuantity = document.getElementById('add-item-quantity'), cancelAddBtn = document.getElementById('cancel-add-btn'), saveAddBtn = document.getElementById('save-add-btn'), addItemBtn = document.getElementById('add-item-btn');

    // --- Estado Local del Controlador ---
    let currentOrder = null; // Almacena el pedido cargado y sus ítems en memoria.
    let generatedInvoiceId = null; // Guarda el ID de la factura una vez generada.
    let availableProducts = []; // Almacena los productos disponibles para añadir a la factura.

    // --- Lógica de Cálculo y Renderizado ---

    /**
     * Calcula y muestra los totales (subtotal, impuesto, propina, total) en tiempo real.
     */
    const calculateAndRenderTotals = () => {
        if (!currentOrder) return;  // Si no hay un pedido cargado, no hace nada.
        // Suma el valor neto de cada producto multiplicado por su cantidad.
        const subtotal = currentOrder.Productos.reduce((acc, item) => acc + (item.valor_neto * item.DetallePedido.cantidad), 0);
        // Se calcula el impuesto sobre el subtotal.
        const tax = subtotal * 0.08; 
        const tip = parseFloat(tipInput.value) || 0; // Propina ingresada por el usuario, o 0 si no se ha ingresado.
        const total = subtotal + tax + tip; // Total final incluyendo subtotal, impuesto y propina.
        summarySubtotal.textContent = `$${subtotal.toFixed(2)}`; // Muestra el subtotal formateado a 2 decimales.
        summaryTax.textContent = `$${tax.toFixed(2)}`; // Muestra el impuesto formateado a 2 decimales.
        summaryTotal.textContent = `$${total.toFixed(2)}`; // Muestra el total formateado a 2 decimales.
    };

    /**
     * @description Inicia los listeners de Socket.IO para reaccionar a cambios
     *              de estado/cancelación del pedido actualmente cargado.
     * @returns {void}
     */
    const startRealtimeInvoice = () => {
        const socket = getSocket() || connectSocket();
        if (!socket) return;

        socket.off('cambio_estado_pedido');
        socket.off('pedido_cancelado');

        socket.on('cambio_estado_pedido', (payload) => {
            const pedidoId = payload?.data?.pedido_id;
            if (!pedidoId || !currentOrder || currentOrder.pedido_id !== pedidoId) return;

            showAlert(`El pedido #${pedidoId} cambió de estado. La información se recargará.`, 'info');
            init(true);
        });

        socket.on('pedido_cancelado', (payload) => {
            const pedidoId = payload?.data?.pedido_id;
            if (!pedidoId || !currentOrder || currentOrder.pedido_id !== pedidoId) return;

            showAlert(`El pedido #${pedidoId} fue cancelado. No es posible continuar con la factura.`, 'warning');
            currentOrder = null;
            detailsSection.style.display = 'none';
            finalInvoiceSection.style.display = 'none';
            document.getElementById('order-selection-section').style.display = 'block';
            init(true);
        });
    };

    /**
     * Renderiza la tabla de ítems del pedido actual.
     */
    const renderTable = () => {
        // Mapea los productos del pedido y genera filas de tabla.
        tableBody.innerHTML = currentOrder.Productos.map((item, index) => `
            <tr>
                <td>${item.nombre_producto}</td>
                <td>${item.DetallePedido.cantidad}</td>
                <td>$${parseFloat(item.valor_neto).toFixed(2)}</td>
                <td>$${(item.valor_neto * item.DetallePedido.cantidad).toFixed(2)}</td>
                <td class="table-actions">
                    <button class="btn btn--info btn--small edit-item-btn" data-index="${index}">Editar</button>
                    <button class="btn btn--danger btn--small delete-item-btn" data-index="${index}" data-name="${item.nombre_producto}">Eliminar</button>
                </td>
            </tr>
        `).join(''); 
        calculateAndRenderTotals();// Llama a la función para calcular y mostrar los totales actualizados.
    };

    // --- Manejadores de Eventos y API ---

    /**
     * Carga los detalles de un pedido seleccionado.
     */
    const handleLoadOrder = async () => { 
        const orderId = selectOrder.value; // Obtiene el ID del pedido seleccionado en el dropdown.
        if (!orderId) { showAlert('Por favor, seleccione un pedido.', 'warning'); return; } // Si no hay un pedido seleccionado, muestra una alerta y sale de la función.
        
        try {
            currentOrder = await api.get(`pedidos/${orderId}`);// Llama a la API para obtener los detalles del pedido seleccionado.
            tipInput.value = "0.00"; // Resetea el campo de propina a 0.00.
            renderTable(); // Renderiza la tabla con los ítems del pedido actual.
            detailsSection.style.display = 'block'; // Muestra la sección de detalles del pedido.
            finalInvoiceSection.style.display = 'none'; // Asegura que la sección de factura final esté oculta al cargar un nuevo pedido.
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };
    
    /**
     * Abre y configura el modal para editar la cantidad de un ítem.
     * @param {number} index - El índice del ítem en el array currentOrder.Productos.
     */
    const handleEditItem = (index) => { 
        const item = currentOrder.Productos[index]; // Obtiene el ítem del pedido actual según el índice proporcionado.
        editItemForm.querySelector('#edit-item-index').value = index; // Guarda el índice del ítem en un campo oculto del formulario para usarlo al guardar los cambios.
        editItemName.textContent = item.nombre_producto; // Muestra el nombre del ítem en el modal de edición.
        editItemQuantity.value = item.DetallePedido.cantidad; // Establece la cantidad actual del ítem en el campo de entrada del modal.
        editItemModal.classList.add('is-active'); // Muestra el modal de edición para que el usuario pueda modificar la cantidad del ítem.
    };

    /**
     * Guarda la nueva cantidad de un ítem y actualiza la tabla.
     */
    const handleSaveEdit = () => { 
        const index = editItemForm.querySelector('#edit-item-index').value; // Obtiene el índice del ítem a editar desde un campo oculto en el formulario.
        currentOrder.Productos[index].DetallePedido.cantidad = parseInt(editItemQuantity.value, 10); // Actualiza la cantidad del ítem en el pedido actual con el valor ingresado en el campo de cantidad del modal.
        renderTable(); // Vuelve a renderizar la tabla de ítems para reflejar los cambios realizados.
        editItemModal.classList.remove('is-active'); // Cierra el modal de edición después de guardar los cambios.
    };

    /**
     * Elimina un ítem de la factura (solo en la memoria, antes de generar).
     * @param {number} index - El índice del ítem a eliminar.
     * @param {string} name - El nombre del ítem para el modal de confirmación.
     */
    const handleDeleteItem = async (index, name) => { 
        try {
            await showConfirmModal('Confirmar Eliminación', `¿Está seguro de que desea eliminar <strong>${name}</strong> de la factura?`);
            currentOrder.Productos.splice(index, 1); // Elimina el ítem del array de productos del pedido actual usando el índice proporcionado.
            renderTable();// Vuelve a renderizar la tabla de ítems para reflejar los cambios después de la eliminación.
            showAlert('Artículo eliminado de la factura.', 'success');
        } catch { 
            console.log("Eliminación de artículo cancelada.");
        }
    };
    
    /**
     * Envía los datos finales para crear la factura en el backend.
     */
    const handleFinalizeInvoice = async () => { 
        if (!currentOrder) return; // Si no hay un pedido cargado, no hace nada.
        
        const originalButtonText = finalizeBtn.innerHTML; // Guarda el texto original del botón de finalización para restaurarlo después.
        finalizeBtn.disabled = true; // Deshabilita el botón para evitar múltiples clics mientras se procesa la solicitud.
        finalizeBtn.innerHTML = `<span class="spinner"></span> Generando...`; // Cambia el texto del botón a un spinner mientras se genera la factura.

        const invoiceData = { // Prepara los datos necesarios para crear la factura.
            pedido_id: currentOrder.pedido_id, 
            metodo_pago_id: paymentMethodSelect.value,
            propina: parseFloat(tipInput.value) || 0
        }; // Incluye el ID del pedido, el método de pago seleccionado y la propina ingresada por el usuario.

        try {
            const result = await api.post('facturas', invoiceData); // Envía una solicitud POST a la API para crear la factura con los datos preparados.
            generatedInvoiceId = result.factura.factura_id; // Guarda el ID de la factura generada para futuras referencias (como anulación o envío por email).
            showAlert(result.message, 'success'); 
            
            await init(true); // Recarga la lista de pedidos a facturar.

            detailsSection.style.display = 'none'; // Oculta la sección de detalles del pedido para mostrar la factura generada.
            document.getElementById('order-selection-section').style.display = 'block'; // Muestra la sección de selección de pedidos para permitir al usuario generar otra factura si lo desea.
            finalInvoiceTitle.textContent = `Factura #${generatedInvoiceId} Generada`; // Actualiza el título de la sección final para reflejar el ID de la factura generada.
            const finalTableHTML = `<table class="invoice-table"><thead>${document.getElementById('invoice-items-table').querySelector('thead').innerHTML}</thead><tbody>${tableBody.innerHTML}</tbody></table>`; // Crea el HTML de la tabla de ítems de la factura generada.
            const finalSummaryHTML = `<div class="invoice-summary">${document.querySelector('.invoice-summary-details').outerHTML}</div>`; // Crea el HTML del resumen de la factura generada.
            finalInvoiceContent.innerHTML = finalTableHTML + finalSummaryHTML; // Muestra el contenido final de la factura generada.
            finalInvoiceSection.style.display = 'block'; // Muestra la sección final de la factura generada al usuario.

        } catch (error) {
            showAlert(error.message, 'error');
        } finally {
            finalizeBtn.disabled = false; // Restaura el estado del botón de finalización.
            finalizeBtn.innerHTML = originalButtonText; // Restaura el texto original del botón de finalización.
        }
    };

    /**
     * Anula una factura recién creada para permitir su corrección.
     */
    const handleVoidInvoice = async () => {
        if (!generatedInvoiceId) return; // Si no hay una factura generada, no hace nada.

        const originalButtonText = voidInvoiceBtn.innerHTML;
        voidInvoiceBtn.disabled = true;
        voidInvoiceBtn.innerHTML = `<span class="spinner"></span> Anulando...`;

        try {
            await showConfirmModal('Confirmar Anulación', `¿Está seguro de que desea anular la factura <strong>#${generatedInvoiceId}</strong>? Esta acción no se puede deshacer.`); // Muestra un modal de confirmación.
            const response = await api.post(`facturas/${generatedInvoiceId}/void`); // Envía una solicitud POST a la API para anular la factura.
            showAlert(response.message, 'success'); // Muestra una alerta de éxito.
            
            // Vuelve a la pantalla de edición para corregir el pedido.
            finalInvoiceSection.style.display = 'none'; // Oculta la sección de factura final.
            detailsSection.style.display = 'block';  // Muestra la sección de detalles del pedido para permitir al usuario corregirlo.
            
            await init(true); // Recarga la lista de pedidos.

        } catch (error) {
            if (error && error.message) {
                showAlert(error.message, 'error');
            } else {
                console.log("Anulación cancelada por el usuario."); 
            }
        } finally {
            voidInvoiceBtn.disabled = false; // Restaura el estado del botón de anulación. 
            voidInvoiceBtn.innerHTML = originalButtonText; // Restaura el texto original del botón de anulación.
        }
    };

    /**
     * Maneja el envío de la factura por correo electrónico.
     */
    const handleSendEmail = async (e) => {
        e.preventDefault(); // Previene el comportamiento por defecto del formulario.
        const email = emailInput.value; // Obtiene el correo electrónico ingresado.
        const submitBtn = sendEmailSubmitBtn; // Obtiene el botón de envío del modal.

        if (!submitBtn) {
            showAlert('No se encontró el botón de envío del formulario.', 'error');
            return;
        }

        if (validateEmail(email) && generatedInvoiceId) { // Verifica que el correo sea válido y que haya una factura generada.
            const originalButtonText = submitBtn.innerHTML; // Guarda el texto original del botón de envío.
            submitBtn.disabled = true; // Deshabilita el botón de envío para evitar múltiples envíos.
            submitBtn.innerHTML = `<span class="spinner"></span> Enviando...`; // Cambia el texto del botón a un spinner mientras se envía el correo.

            try {
                const response = await api.post(`facturas/${generatedInvoiceId}/send-email`, { email }); // Envía la solicitud para enviar el correo.
                sendEmailModal.classList.remove('is-active'); // Cierra el modal.
                showAlert(response.message, 'success'); // Muestra una alerta de éxito.
            } catch (error) {
                showAlert(error.message, 'error');
            } finally {
                submitBtn.disabled = false; // Restaura el estado del botón de envío.
                submitBtn.innerHTML = originalButtonText; // Restaura el texto original del botón.
            }
        } else {
            showAlert('Formato de correo inválido.', 'error'); // Muestra una alerta de error si el correo no es válido.
        }
    };

    /**
     * Carga los productos disponibles para añadir a la factura.
     */
    const loadAvailableProducts = async () => {
        try {
            availableProducts = await api.get('productos');
            addItemProduct.innerHTML = '<option value="">-- Seleccione un producto --</option>' +
                availableProducts.map(p => `<option value="${p.producto_id}">${p.nombre_producto} - $${parseFloat(p.valor_neto).toFixed(2)}</option>`).join('');
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    /**
     * Abre el modal para añadir un nuevo producto.
     */
    const handleAddItem = () => {
        addItemForm.reset();
        addItemQuantity.value = 1;
        loadAvailableProducts();
        addItemModal.classList.add('is-active');
    };

    /**
     * Guarda un nuevo producto en la factura.
     */
    const handleSaveAdd = async () => {
        const productId = addItemProduct.value;
        const quantity = parseInt(addItemQuantity.value);

        if (!productId || !quantity || quantity < 1) {
            showAlert('Por favor, seleccione un producto y una cantidad válida.', 'warning');
            return;
        }

        const selectedProduct = availableProducts.find(p => p.producto_id == productId);
        if (!selectedProduct) {
            showAlert('Producto no encontrado.', 'error');
            return;
        }

        // Verificar si el producto ya está en el pedido
        const existingItemIndex = currentOrder.Productos.findIndex(p => p.producto_id == productId);
        if (existingItemIndex !== -1) {
            // Si ya existe, solo actualizamos la cantidad
            currentOrder.Productos[existingItemIndex].DetallePedido.cantidad += quantity;
        } else {
            // Si no existe, lo agregamos como nuevo
            currentOrder.Productos.push({
                producto_id: selectedProduct.producto_id,
                nombre_producto: selectedProduct.nombre_producto,
                valor_neto: selectedProduct.valor_neto,
                DetallePedido: {
                    cantidad: quantity
                }
            });
        }

        renderTable();
        addItemModal.classList.remove('is-active');
        showAlert('Producto añadido correctamente.', 'success');
    };

    // --- Inicialización del Controlador ---
    /**
     * Inicializa la vista, cargando los datos necesarios para los selectores.
     * @param {boolean} [isRefresh=false] - Si es true, no recarga los métodos de pago.
     */
    const init = async (isRefresh = false) => { 
        try {
            // Carga los métodos de pago solo la primera vez.
            if (!isRefresh) { 
                const paymentMethods = await api.get('metodos-pago'); // Llama a la API para obtener la lista de métodos de pago.
                paymentMethodSelect.innerHTML = paymentMethods.map(p => `<option value="${p.metodo_pago_id}">${p.nombre_metodo}</option>`).join(''); // Agrega los métodos de pago al selector.
                await loadAvailableProducts(); // Carga los productos disponibles.
            }
            // Carga (o recarga) la lista de pedidos en estado 'entregado'.
            const orders = await api.get('pedidos?estado=entregado'); // Llama a la API para obtener los pedidos 'entregado'.
            selectOrder.innerHTML = '<option value="">-- Seleccione un pedido --</option>' + 
                orders.map(o => `<option value="${o.pedido_id}">Pedido #${o.pedido_id} - Mesa ${o.Mesa?.numero_mesa || 'N/A'}</option>`).join(''); // Agrega los pedidos al selector.

        } catch (error) {
            showAlert(error.message, 'error');
        }
    };
    
    // --- Asignación de Event Listeners ---
    tableBody.addEventListener('click', (e) => { // Escucha los clics en la tabla de ítems.
        const target = e.target; // Obtiene el elemento que disparó el evento.
        if (target.matches('.edit-item-btn')) {
            handleEditItem(target.dataset.index); // Llama a la función para editar el ítem.
        } else if (target.matches('.delete-item-btn')) { 
            handleDeleteItem(target.dataset.index, target.dataset.name); // Llama a la función para eliminar el ítem.
        }
    });

    loadBtn.onclick = handleLoadOrder; // Asigna el manejador de eventos para cargar los detalles del pedido.
    tipInput.oninput = () => calculateAndRenderTotals(); // Asigna el manejador de eventos para calcular los totales cuando se ingresa una propina.
    finalizeBtn.onclick = handleFinalizeInvoice; // Asigna el manejador de eventos para finalizar la factura.
    voidInvoiceBtn.onclick = handleVoidInvoice; // Asigna el manejador de eventos para anular la factura.
    sendEmailBtn.onclick = () => sendEmailModal.classList.add('is-active'); // Abre el modal de envío de correo.
    addItemBtn.onclick = handleAddItem; // Abre el modal para añadir producto.
    
    cancelEditBtn.onclick = () => editItemModal.classList.remove('is-active'); // Cierra el modal de edición.
    editItemModal.querySelector('.modal__close-btn').onclick = () => editItemModal.classList.remove('is-active'); // Cierra el modal de edición.
    saveEditBtn.onclick = handleSaveEdit; // Guarda los cambios de edición.

    cancelAddBtn.onclick = () => addItemModal.classList.remove('is-active'); // Cierra el modal de añadir.
    addItemModal.querySelector('.modal__close-btn').onclick = () => addItemModal.classList.remove('is-active'); // Cierra el modal de añadir.
    saveAddBtn.onclick = handleSaveAdd; // Guarda el nuevo producto.

    cancelEmailBtn.onclick = () => sendEmailModal.classList.remove('is-active'); // Cierra el modal de envío de correo.
    sendEmailModal.querySelector('.modal__close-btn').onclick = () => sendEmailModal.classList.remove('is-active'); // Cierra el modal de envío de correo.
    sendEmailForm.onsubmit = handleSendEmail; // Asigna el manejador de eventos para enviar el correo.

    init(); // Inicializa la vista.
    startRealtimeInvoice();
};

