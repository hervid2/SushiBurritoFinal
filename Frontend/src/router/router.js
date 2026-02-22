// =================================================================
// ARCHIVO: src/router/router.js
// ROL: Cerebro de la Single Page Application (SPA). Gestiona qué
//      vista y qué lógica cargar en función de la URL del navegador.
// =================================================================

// Importaciones de todos los controladores de las vistas.
import { loginController } from "../views/auth/loginController.js";
import { forgotPasswordController } from "../views/auth/forgotPasswordController.js";
import { resetPasswordController } from "../views/auth/resetPasswordController.js";
import { dashboardController } from "../views/admin/dashboard/dashboardController.js";
import { usersController } from "../views/admin/users/usersController.js";
import { menuController } from "../views/admin/menu/menuController.js";
import { statsController } from "../views/admin/stats/statsController.js";
import { kitchenOrdersController } from "../views/kitchen/kitchenOrdersController.js";
import { waiterOrdersController } from "../views/waiter/waiterOrdersController.js";
import { waiterInvoiceGeneratorController } from "../views/waiter/waiterInvoiceGeneratorController.js";
import { waiterOrdersStatusController } from "../views/waiter/waiterOrdersStatusController.js";

// Importación de controladores y helpers compartidos.
import { navigationController } from "../views/shared/navigationController.js";
import { showAlert } from '../helpers/alerts.js';
import { loadView } from '../helpers/loadview.js'; 
import { connectSocket, disconnectSocket } from '../helpers/socketClient.js';

/**
 * @description Mapa de todas las rutas de la aplicación.
 */
export const routes = {
    // Rutas de Autenticación (públicas)
    "login": { template: "auth/login.html", controller: loginController, title: "Iniciar Sesión", public: true },
    "forgot-password": { template: "auth/forgot-password.html", controller: forgotPasswordController, title: "Recuperar Contraseña", public: true },
    "reset-password": { template: "auth/reset-password.html", controller: resetPasswordController, title: "Restablecer Contraseña", public: true },
    
    // Rutas de Administrador (protegidas por rol)
    "admin/dashboard": { template: "admin/dashboard/dashboard.html", controller: dashboardController, title: "Panel administrativo", roles: ['administrador'] },
    "admin/users": { template: "admin/users/usersManagement.html", controller: usersController, title: "Gestión de Usuarios", roles: ['administrador'] },
    "admin/menu": { template: "admin/menu/menuManagement.html", controller: menuController, title: "Gestión de Menú y mesas", roles: ['administrador'] },
    "admin/stats": { template: "admin/stats/statsOverview.html", controller: statsController, title: "Estadísticas", roles: ['administrador'] },
    
    // Rutas de Cocina (protegidas y por estado)
    "kitchen/orders/pending": { template: "kitchen/kitchenOrders.html", controller: kitchenOrdersController, title: "Pedidos Pendientes", roles: ['cocinero'], status: 'pendiente' },
    "kitchen/orders/preparing": { template: "kitchen/kitchenOrders.html", controller: kitchenOrdersController, title: "Pedidos en Preparación", roles: ['cocinero'], status: 'en_preparacion' },
    "kitchen/orders/ready": { template: "kitchen/kitchenOrders.html", controller: kitchenOrdersController, title: "Pedidos Listos", roles: ['cocinero'], status: 'preparado' },
    
    // Rutas de Mesero (protegidas)
    "waiter/orders": { template: "waiter/waiterOrdersManagement.html", controller: waiterOrdersController, title: "Gestión de Pedidos", roles: ['mesero'] },
    "waiter/orders-status": { template: "waiter/waiterOrdersStatus.html", controller: waiterOrdersStatusController, title: "Estado de Pedidos", roles: ['mesero'] },
    "waiter/invoice": { template: "waiter/waiterInvoiceGenerator.html", controller: waiterInvoiceGeneratorController, title: "Generación de Factura", roles: ['mesero'] },
    
    // Ruta de Error 404 (pública)
    "404": { template: "shared/404.html", title: "Página No Encontrada", public: true }
};

/**
 * @description Cambia la ruta actual de la aplicación actualizando el hash de la URL.
 * @param {string} path - La ruta a la que se desea navegar.
 */
export const navigateTo = (path) => {
    window.location.hash = path;
};

/**
 * @description Actualiza los componentes de UI compartidos (header, nav) según el estado de autenticación y la ruta actual.
 * @param {boolean} isAuthenticated - Si el usuario ha iniciado sesión.
 * @param {string} userRole - El rol del usuario actual.
 * @param {object} route - El objeto de la ruta actual desde el mapa `routes`.
 */
const updateSharedUI = (isAuthenticated, userRole, route) => {
    const headerContainer = document.getElementById('header-container');
    const navContainer = document.getElementById('navigation-container');
    const footerContainer = document.getElementById('footer-container');

    const isPublicView = route.public;

    headerContainer.style.display = !isPublicView ? 'block' : 'none';
    navContainer.style.display = !isPublicView ? 'block' : 'none';
    footerContainer.style.display = 'block';

    if (!isPublicView && isAuthenticated) {
        const appTitleElement = document.getElementById('app-title');
        if (appTitleElement) {
            appTitleElement.textContent = route.title || 'Sushi Burrito';
        }

        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.style.display = 'inline-block';
            const newLogoutButton = logoutButton.cloneNode(true);
            logoutButton.parentNode.replaceChild(newLogoutButton, logoutButton);

            newLogoutButton.addEventListener('click', () => {
                showAlert('Has cerrado sesión.', 'success');
                disconnectSocket();
                localStorage.clear();
                navigateTo('/login'); 
            });
        }

        navigationController({ role: userRole });
    }
};

/**
 * @description Función principal que se ejecuta en cada carga o cambio de URL.
 */
export const loadContent = async () => {
    const fullHash = (window.location.hash.substring(1) || "/").startsWith('/')
        ? window.location.hash.substring(2)
        : window.location.hash.substring(1);
    const pathParts = fullHash.split('?');
    const path = pathParts[0] || "/";
    const queryString = pathParts[1] || "";
    const urlParams = new URLSearchParams(queryString);
    const params = Object.fromEntries(urlParams.entries());

    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userRole = localStorage.getItem('userRole');

    if (path === "" || path === "/") {
        navigateTo(isAuthenticated ? 'admin/dashboard' : 'login');
        return;
    }
    if (path === "kitchen/orders") {
        navigateTo('kitchen/orders/pending');
        return;
    }

    const route = routes[path];

    if (!route) {
        navigateTo('404');
        return;
    }
    
    if (route.public && isAuthenticated && path !== 'reset-password') {
        navigateTo('admin/dashboard');
        return;
    }

    if (!route.public && !isAuthenticated) {
        navigateTo('login');
        return;
    }

    if (!route.public && isAuthenticated) {
        connectSocket();
    }

    if (route.roles && !route.roles.includes(userRole)) {
        showAlert('No tienes permiso para acceder a esta página.', 'error');
        const defaultRoutes = {
            administrador: 'admin/dashboard',
            mesero: 'waiter/orders',
            cocinero: 'kitchen/orders/pending'
        };
        navigateTo(defaultRoutes[userRole] || 'login');
        return;
    }

    try {
        const appContainer = document.getElementById('app');
        
        // Se utiliza el helper 'loadView' para cargar el HTML
        await loadView(`/src/views/${route.template}`, appContainer);

        document.title = route.title;
        updateSharedUI(isAuthenticated, userRole, route);

        if (route.controller) {
            params.routeInfo = route;
            route.controller(params);
        }
    } catch (error) {
        console.error("Error al cargar el contenido de la ruta:", error);
        navigateTo('404');
    }
};

/**
 * @description Punto de entrada de la aplicación.
 */
const initializeApp = async () => {
    const headerContainer = document.getElementById('header-container');
    const navContainer = document.getElementById('navigation-container');
    const footerContainer = document.getElementById('footer-container');
    
    try {
        headerContainer.innerHTML = await (await fetch('/src/views/shared/header.html')).text();
        navContainer.innerHTML = await (await fetch('/src/views/shared/navigation.html')).text();
        footerContainer.innerHTML = await (await fetch('/src/views/shared/footer.html')).text();

        window.addEventListener('hashchange', loadContent);
        
        loadContent();

        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        if (isAuthenticated) {
            connectSocket();
        }

    } catch (error) {
        console.error("Fallo crítico al inicializar los componentes de la aplicación:", error);
        document.body.innerHTML = "Error crítico al cargar la aplicación. Por favor, intente de nuevo más tarde.";
    }
};

// Inicia la aplicación.
initializeApp();
