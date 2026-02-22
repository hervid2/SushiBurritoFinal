// =================================================================
// ARCHIVO: src/views/admin/menu/menuController.js
// ROL: Controlador para la vista de gestión de Menú, Categorías y Mesas.
//      Este es un controlador complejo que maneja múltiples entidades
//      y sus interacciones CRUD en una sola interfaz.
// =================================================================

import { showAlert } from '../../../helpers/alerts.js';
import { showConfirmModal } from '../../../helpers/modalHelper.js';
import { api } from '../../../helpers/solicitudes.js';

/**
 * Controlador principal para la vista de gestión del restaurante.
 */
export const menuController = () => {
    // --- Referencias a Elementos del DOM ---
    // Se capturan todos los elementos interactivos de la vista para un acceso eficiente.
    const menuItemFormSection = document.getElementById('menu-item-form-section');
    const menuItemForm = document.getElementById('menu-item-form');
    const formTitle = document.getElementById('form-title');
    const menuItemsTableBody = document.querySelector('#menu-items-table tbody');
    const categoriesTableBody = document.querySelector('#categories-table tbody');
    const tablesTableBody = document.querySelector('#tables-table tbody');
    const addCategoryForm = document.getElementById('add-category-form');
    const addTableForm = document.getElementById('add-table-form');
    const itemCategorySelect = document.getElementById('item-category');
    const menuItemsPagination = document.getElementById('menu-items-pagination');
    const categoriesPagination = document.getElementById('categories-pagination');
    const tablesPagination = document.getElementById('tables-pagination');
    const toggleRestoreProductsBtn = document.getElementById('toggle-restore-products-btn');
    const toggleRestoreCategoriesBtn = document.getElementById('toggle-restore-categories-btn');
    const toggleRestoreTablesBtn = document.getElementById('toggle-restore-tables-btn');
    const restoreProductsContent = document.getElementById('restore-products-content');
    const restoreCategoriesContent = document.getElementById('restore-categories-content');
    const restoreTablesContent = document.getElementById('restore-tables-content');
    const deletedProductsSelect = document.getElementById('deleted-products-select');
    const deletedCategoriesSelect = document.getElementById('deleted-categories-select');
    const deletedTablesSelect = document.getElementById('deleted-tables-select');
    const restoreProductBtn = document.getElementById('restore-product-btn');
    const restoreCategoryBtn = document.getElementById('restore-category-btn');
    const restoreTableBtn = document.getElementById('restore-table-btn');

    // --- Estado Local del Controlador ---
    // Almacena los datos completos de la API y el estado de la paginación.
    const categoryColorMap = {}; // Objeto para asignar colores consistentes a las categorías.
    let categoryNameMap = new Map(); // Mapa para una búsqueda eficiente de nombres de categoría por ID.
    let allMenuItems = [], allCategories = [], allTables = []; // Arrays para guardar todos los datos.
    let currentPage = 1, currentCategoriesPage = 1, currentTablesPage = 1; // Contadores de página para cada tabla.
    const itemsPerPage = 5; // Número de ítems a mostrar por página.

    // --- Lógica de Renderizado ---

    /**
     * Función genérica para renderizar los controles de paginación para una tabla.
     * @param {HTMLElement} container - El elemento contenedor para los botones de paginación.
     * @param {number} totalItems - El número total de ítems en el dataset completo.
     * @param {number} currentPage - El número de la página activa actualmente.
     * @param {function} pageChangeCallback - La función a ejecutar cuando se hace clic en un botón de página.
     */
    const renderPagination = (container, totalItems, currentPage, pageChangeCallback) => {
        if (!container) return; // Verifica si el contenedor de paginación existe
        container.innerHTML = ''; // Limpia el contenido del contenedor de paginación antes de renderizar nuevos botones
        const totalPages = Math.ceil(totalItems / itemsPerPage); //calcula cuántas páginas se deben mostrar en total
        if (totalPages <= 1) return; // si hay solo 1 página, no muestra paginación

        let buttonsHTML = '<ul>'; // Crea una lista desordenada para los botones de paginación
        for (let i = 1; i <= totalPages; i++) {// Itera desde la página 1 hasta la última página
            buttonsHTML += `<li><button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button></li>`; // Añade estilo a la página seleccionada y guarda en memoria con cada iteración ${i} el # de pag
        }
        buttonsHTML += '</ul>'; // Cierra la lista de botones
        container.innerHTML = buttonsHTML; // Asigna el HTML generado a la sección de paginación

        container.querySelectorAll('.pagination-btn').forEach(btn => { // Asigna un listener a cada botón de paginación
            btn.addEventListener('click', (e) => { // Escucha el evento de clic en cada botón de paginación
                pageChangeCallback(parseInt(e.target.dataset.page)); // Llama a la función de callback con el número de página seleccionado
            });
        });
    };
    
    /**
     * Renderiza la página actual de la tabla de productos (platos y bebidas).
     */
    const renderMenuItems = () => {
        const startIndex = (currentPage - 1) * itemsPerPage; // Calcula el índice de inicio para la paginación
        const pageItems = allMenuItems.slice(startIndex, startIndex + itemsPerPage); // Obtiene los ítems de la página actual
        menuItemsTableBody.innerHTML = pageItems.map(item => { // Mapea los ítems a filas de la tabla
            const categoryName = categoryNameMap.get(item.categoria_id) || 'Sin categoría'; // Obtiene el nombre de la categoría o asigna 'Sin categoría' si no existe
            const style = getCategoryStyle(categoryName); // Obtiene el estilo de color para la categoría
            return `
                <tr>
                    <td>${item.nombre_producto}</td> 
                    <td>$${parseFloat(item.valor_neto).toFixed(2)}</td> 
                    <td><span class="category-badge" ${style}>${categoryName}</span></td>
                    <td class="table-actions">
                        <button class="btn btn--info btn--small edit-item-btn" data-id="${item.producto_id}">Editar</button> 
                        <button class="btn btn--danger btn--small delete-item-btn" data-id="${item.producto_id}" data-name="${item.nombre_producto}">Eliminar</button> 
                    </td>
                </tr>`;
        }).join(''); // Convierte el array de filas en un string HTML
        // Se reasignan los listeners a los nuevos botones creados.
        menuItemsTableBody.querySelectorAll('.edit-item-btn').forEach(btn => btn.addEventListener('click', (e) => handleEditClick(e.currentTarget.dataset.id))); // Asigna el listener de edición a cada botón de editar
        menuItemsTableBody.querySelectorAll('.delete-item-btn').forEach(btn => btn.addEventListener('click', (e) => handleDeleteClick(e.currentTarget.dataset.id, e.currentTarget.dataset.name, 'productos'))); // Asigna el listener de eliminación a cada botón de eliminar
        // Se actualiza la paginación.
        renderPagination(menuItemsPagination, allMenuItems.length, currentPage, (page) => { // Actualiza la paginación de productos
            currentPage = page; // Actualiza la página actual
            renderMenuItems(); // Vuelve a renderizar los ítems del menú para la nueva página
        });
    };

    /**
     * Renderiza la página actual de la tabla de categorías.
     */
    const renderCategories = () => {
        const startIndex = (currentCategoriesPage - 1) * itemsPerPage; // Calcula el índice de inicio para la paginación de categorías
        const pageItems = allCategories.slice(startIndex, startIndex + itemsPerPage); // Obtiene los ítems de la página actual de categorías
        categoriesTableBody.innerHTML = pageItems.map(cat => ` 
            <tr>
                <td><span class="category-badge" ${getCategoryStyle(cat.nombre)}>${cat.nombre}</span></td> 
                <td class="table-actions"><button class="btn btn--danger btn--small delete-category-btn" data-id="${cat.categoria_id}" data-name="${cat.nombre}">Eliminar</button></td> 
            </tr>
        `).join(''); // Convierte el array de filas en un string HTML
        categoriesTableBody.querySelectorAll('.delete-category-btn').forEach(btn => btn.addEventListener('click', (e) => handleDeleteClick(e.currentTarget.dataset.id, e.currentTarget.dataset.name, 'categorias'))); // Asigna el listener de eliminación a cada botón de eliminar categoría
        renderPagination(categoriesPagination, allCategories.length, currentCategoriesPage, (page) => { // Actualiza la paginación de categorías
            currentCategoriesPage = page; // Actualiza la página actual de categorías
            renderCategories(); // Vuelve a renderizar las categorías para la nueva página
        });
    };

    /**
     * Renderiza la página actual de la tabla de mesas.
     */
    const renderTables = () => {
        const startIndex = (currentTablesPage - 1) * itemsPerPage; // Calcula el índice de inicio para la paginación de mesas 
        const pageItems = allTables.slice(startIndex, startIndex + itemsPerPage); // Obtiene los ítems de la página actual de mesas
        tablesTableBody.innerHTML = pageItems.map(table => ` 
            <tr>
                <td>${table.numero_mesa}</td>
                <td>${table.estado}</td>
                <td class="table-actions"><button class="btn btn--danger btn--small delete-table-btn" data-id="${table.mesa_id}" data-name="Mesa ${table.numero_mesa}">Eliminar</button></td>
            </tr>
        `).join(''); // Convierte el array de filas en un string HTML
        tablesTableBody.querySelectorAll('.delete-table-btn').forEach(btn => btn.addEventListener('click', (e) => handleDeleteClick(e.currentTarget.dataset.id, e.currentTarget.dataset.name, 'mesas'))); // Asigna el listener de eliminación a cada botón de eliminar mesa
        renderPagination(tablesPagination, allTables.length, currentTablesPage, (page) => { // Actualiza la paginación de mesas
            currentTablesPage = page; // Actualiza la página actual de mesas
            renderTables(); // Vuelve a renderizar las mesas para la nueva página
        });
    };

    // --- Funciones Auxiliares y de Carga ---

    /**
     * Genera un color consistente basado en el nombre de la categoría para las insignias.
     * @param {string} categoryName - El nombre de la categoría.
     * @returns {string} - Un string de estilo CSS (ej. 'style="background-color: #123456"').
     */
    const getCategoryStyle = (categoryName) => {
        if (!categoryNameMap.has(categoryName) && !categoryColorMap[categoryName]) {
            // Genera un color pseudo-aleatorio pero determinista a partir del nombre.
            const hash = categoryName.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0); // Crea un hash simple del nombre de la categoría
            const color = `hsl(${hash % 360}, 70%, 50%)`; // Genera un color HSL basado en el hash
            categoryColorMap[categoryName] = color; // Guarda el color en el mapa para reutilizarlo
        }
        return `style="background-color: ${categoryColorMap[categoryName]}"`; // Devuelve el estilo CSS con el color generado
    };

    /**
     * Alterna la visibilidad de un panel de restauración.
     * @param {HTMLElement} panelElement - El contenedor del panel a mostrar u ocultar.
     */
    const toggleRestorePanel = (panelElement) => {
        if (!panelElement) return;
        panelElement.style.display = panelElement.style.display === 'none' ? 'block' : 'none';
    };

    /**
     * Carga los productos eliminados en su selector de restauración.
     */
    const loadDeletedProducts = async () => {
        if (!deletedProductsSelect) return;
        try {
            const deletedProducts = await api.get('productos/eliminados');
            deletedProductsSelect.innerHTML = deletedProducts.length
                ? '<option value="">-- Seleccione un producto --</option>' +
                  deletedProducts.map(product => `<option value="${product.producto_id}">${product.nombre_producto}</option>`).join('')
                : '<option value="">-- No hay productos eliminados --</option>';
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    /**
     * Carga las categorías eliminadas en su selector de restauración.
     */
    const loadDeletedCategories = async () => {
        if (!deletedCategoriesSelect) return;
        try {
            const deletedCategories = await api.get('categorias/admin/deleted');
            deletedCategoriesSelect.innerHTML = deletedCategories.length
                ? '<option value="">-- Seleccione una categoría --</option>' +
                  deletedCategories.map(category => `<option value="${category.categoria_id}">${category.nombre}</option>`).join('')
                : '<option value="">-- No hay categorías eliminadas --</option>';
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    /**
     * Carga las mesas eliminadas en su selector de restauración.
     */
    const loadDeletedTables = async () => {
        if (!deletedTablesSelect) return;
        try {
            const deletedTables = await api.get('mesas/admin/deleted');
            deletedTablesSelect.innerHTML = deletedTables.length
                ? '<option value="">-- Seleccione una mesa --</option>' +
                  deletedTables.map(table => `<option value="${table.mesa_id}">Mesa ${table.numero_mesa}</option>`).join('')
                : '<option value="">-- No hay mesas eliminadas --</option>';
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    /**
     * Restaura una entidad eliminada según su configuración.
     * @param {Object} config - Configuración de restauración.
     * @param {HTMLSelectElement} config.selectElement - Selector con el ID del elemento eliminado.
     * @param {string} config.entityLabel - Etiqueta legible de la entidad a restaurar.
     * @param {function} config.endpointBuilder - Función para construir el endpoint de restauración.
     * @param {string} config.method - Método HTTP para restaurar (post o put).
     * @param {HTMLElement} [config.panelElement] - Panel a cerrar automáticamente tras restaurar.
     */
    const handleRestoreEntity = async ({ selectElement, entityLabel, endpointBuilder, method, panelElement }) => {
        const selectedId = selectElement?.value;

        if (!selectedId) {
            showAlert(`Seleccione ${entityLabel} para restaurar.`, 'warning');
            return;
        }

        try {
            await showConfirmModal('Confirmar Restauración', `¿Desea restaurar ${entityLabel} seleccionado?`);
            await api[method](endpointBuilder(selectedId));
            showAlert(`${entityLabel} restaurado correctamente.`, 'success');

            await Promise.all([
                loadAllData(),
                loadDeletedProducts(),
                loadDeletedCategories(),
                loadDeletedTables()
            ]);

            // Mejora UX: limpia la selección y cierra el panel al completar restauración.
            if (selectElement) selectElement.value = '';
            if (panelElement) panelElement.style.display = 'none';
        } catch (error) {
            if (error && error.message) showAlert(error.message, 'error');
        }
    };

    /**
     * Carga todos los datos necesarios para la vista desde la API de forma paralela.
     */
    const loadAllData = async () => {
        try {
            const [menuData, categoryData, tableData] = await Promise.all([api.get('productos'), api.get('categorias'), api.get('mesas')]); // Realiza solicitudes paralelas a la API para obtener productos, categorías y mesas
            
            allMenuItems = menuData;
            allCategories = categoryData;
            allTables = tableData;

            currentPage = 1;
            currentCategoriesPage = 1;
            currentTablesPage = 1;

            categoryNameMap = new Map(allCategories.map(cat => [cat.categoria_id, cat.nombre])); // Crea un mapa de ID a nombre de categoría para búsquedas rápidas
            itemCategorySelect.innerHTML = `<option value="" disabled selected>Seleccione...</option>` + allCategories.map(c => `<option value="${c.categoria_id}">${c.nombre}</option>`).join(''); // Llena el select de categorías con las opciones disponibles

            renderMenuItems();
            renderCategories();
            renderTables();
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    // --- Manejadores de Eventos (Lógica CRUD) ---

    const handleSaveMenuItem = async (e) => {
        e.preventDefault();
        const id = document.getElementById('menu-item-id').value; // Obtiene el ID del producto si se está editando, o lo deja vacío si es un nuevo producto
        const itemData = {
            nombre_producto: document.getElementById('item-name').value, // Obtiene el nombre del producto
            descripcion_ingredientes: document.getElementById('item-description').value, // Obtiene la descripción de los ingredientes
            valor_neto: parseFloat(document.getElementById('item-price').value), // Obtiene el precio del producto y lo convierte a float
            categoria_id: parseInt(itemCategorySelect.value) // Obtiene el ID de la categoría seleccionada y lo convierte a entero
        };
        try {
            const endpoint = id ? `productos/${id}` : 'productos'; // Define el endpoint de la API dependiendo de si se está editando o creando un nuevo producto
            const method = id ? 'put' : 'post'; // Define el método HTTP a usar (PUT para editar, POST para crear)
            await api[method](endpoint, itemData); // Realiza la solicitud a la API para crear o actualizar el producto
            showAlert(`Producto ${id ? 'actualizado' : 'creado'} correctamente.`, 'success'); // Muestra un mensaje de éxito
            menuItemFormSection.style.display = 'none'; // Oculta el formulario de producto
            loadAllData(); // Recarga todos los datos para reflejar los cambios
        } catch (error) {
            showAlert(error.message, 'error'); // Muestra un mensaje de error si la solicitud falla
        }
    };

    const handleEditClick = async (id) => {
        try {
            const item = await api.get(`productos/${id}`); // Obtiene los datos del producto a editar
            formTitle.textContent = 'Editar Plato/Bebida'; // Cambia el título del formulario a "Editar"
            document.getElementById('menu-item-id').value = item.producto_id; // Asigna el ID del producto al campo oculto del formulario
            document.getElementById('item-name').value = item.nombre_producto; // Asigna el nombre del producto al campo de entrada
            document.getElementById('item-description').value = item.descripcion_ingredientes; // Asigna la descripción de los ingredientes al campo de entrada
            document.getElementById('item-price').value = item.valor_neto; // Asigna el precio del producto al campo de entrada
            itemCategorySelect.value = item.categoria_id; // Asigna el ID de la categoría al select
            menuItemFormSection.style.display = 'block'; // Muestra el formulario de producto para editar
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };
    
    const handleDeleteClick = async (id, name, type) => {
        try {
            await showConfirmModal('Confirmar Eliminación', `¿Seguro que desea eliminar <strong>${name}</strong>?`); // Muestra un modal de confirmación antes de eliminar
            await api.delete(`${type}/${id}`); // Realiza la solicitud a la API para eliminar el producto, categoría o mesa
            showAlert(`${name} eliminado exitosamente.`, 'success'); // Muestra un mensaje de éxito
            await Promise.all([
                loadAllData(),
                loadDeletedProducts(),
                loadDeletedCategories(),
                loadDeletedTables()
            ]); // Recarga datos visibles y listas de eliminados para reflejar los cambios.
        } catch (error) {
            if (error && error.message) showAlert(error.message, 'error');
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('new-category-name'); // Obtiene el valor del campo de entrada para el nombre de la nueva categoría
        try {
            await api.post('categorias', { nombre: nameInput.value }); // Realiza la solicitud a la API para crear una nueva categoría
            showAlert('Categoría creada con éxito.', 'success'); // Muestra un mensaje de éxito
            nameInput.value = ''; // Limpia el campo de entrada
            loadAllData(); // Recarga todos los datos para reflejar los cambios
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    const handleAddTable = async (e) => {
        e.preventDefault(); // Previene el comportamiento por defecto del formulario
        const numInput = document.getElementById('table-number'); // Obtiene el valor del campo de entrada para el número de la nueva mesa
        try {
            await api.post('mesas', { numero_mesa: parseInt(numInput.value), estado: 'disponible' }); // Realiza la solicitud a la API para crear una nueva mesa con el número ingresado y estado 'disponible'
            showAlert('Mesa creada con éxito.', 'success'); // Muestra un mensaje de éxito
            numInput.value = '';// Limpia el campo de entrada
            loadAllData(); // Recarga todos los datos para reflejar los cambios
        } catch (error) {
            showAlert(error.message, 'error');
        }
    };

    // --- Inicialización del Controlador ---
    const init = () => {
        // Asigna los listeners a los botones principales de la vista.
        document.getElementById('add-menu-item-btn').addEventListener('click', () => { // Muestra el formulario para añadir un nuevo producto
            menuItemForm.reset(); // Resetea el formulario para un nuevo producto
            formTitle.textContent = 'Añadir Nuevo Plato/Bebida'; // Cambia el título del formulario a "Añadir Nuevo"
            document.getElementById('menu-item-id').value = ''; // Limpia el campo oculto del ID del producto
            menuItemFormSection.style.display = 'block'; // Muestra el formulario de producto
        });
        document.getElementById('cancel-menu-item-form-btn').addEventListener('click', () => { // Oculta el formulario de producto sin guardar cambios
            menuItemFormSection.style.display = 'none'; // Oculta el formulario de producto
        });
        menuItemForm.addEventListener('submit', handleSaveMenuItem); // Asigna el listener al formulario de producto para manejar el guardado
        addCategoryForm.addEventListener('submit', handleAddCategory); // Asigna el listener al formulario de categorías para manejar la creación de nuevas categorías
        addTableForm.addEventListener('submit', handleAddTable); // Asigna el listener al formulario de mesas para manejar la creación de nuevas mesas

        toggleRestoreProductsBtn?.addEventListener('click', () => toggleRestorePanel(restoreProductsContent));
        toggleRestoreCategoriesBtn?.addEventListener('click', () => toggleRestorePanel(restoreCategoriesContent));
        toggleRestoreTablesBtn?.addEventListener('click', () => toggleRestorePanel(restoreTablesContent));

        restoreProductBtn?.addEventListener('click', () => handleRestoreEntity({
            selectElement: deletedProductsSelect,
            entityLabel: 'el producto',
            endpointBuilder: (id) => `productos/${id}/restaurar`,
            method: 'put',
            panelElement: restoreProductsContent
        }));

        restoreCategoryBtn?.addEventListener('click', () => handleRestoreEntity({
            selectElement: deletedCategoriesSelect,
            entityLabel: 'la categoría',
            endpointBuilder: (id) => `categorias/${id}/restore`,
            method: 'post',
            panelElement: restoreCategoriesContent
        }));

        restoreTableBtn?.addEventListener('click', () => handleRestoreEntity({
            selectElement: deletedTablesSelect,
            entityLabel: 'la mesa',
            endpointBuilder: (id) => `mesas/${id}/restore`,
            method: 'post',
            panelElement: restoreTablesContent
        }));
        
        // Carga todos los datos iniciales al entrar a la vista.
        loadAllData();
        loadDeletedProducts();
        loadDeletedCategories();
        loadDeletedTables();
    };
    
    // Ejecuta la función de inicialización.
    init();
};
