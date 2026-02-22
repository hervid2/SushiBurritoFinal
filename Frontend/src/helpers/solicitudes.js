// =================================================================
// ARCHIVO: src/helpers/solicitudes.js
// ROL: Módulo centralizado para gestionar todas las peticiones
//      HTTP (fetch) a la API del backend. Actúa como una capa de
//      abstracción para simplificar y estandarizar la comunicación.
// =================================================================

import { showAlert } from './alerts.js';
import { navigateTo } from '../router/router.js';

// URL base del backend. Centralizarla aquí facilita el cambio
// entre entornos de desarrollo y producción.
const API_URL = 'http://localhost:3000/api';
const DEFAULT_HEADERS = { 'Content-Type': 'application/json' };

let refreshInFlightPromise = null;

/**
 * Limpia únicamente las claves de autenticación para evitar borrar datos ajenos a sesión.
 */
function clearAuthStorage() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('accessToken');
}

/**
 * Redirige al login tras limpiar la sesión local del cliente.
 * @param {string} message - Mensaje opcional para notificar al usuario.
 */
function clearSessionAndRedirect(message = 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.') {
    clearAuthStorage();
    showAlert(message, 'error');
    navigateTo('login');
}

/**
 * Intenta parsear JSON de la respuesta. Si no hay cuerpo JSON válido, retorna objeto vacío.
 * @param {Response} response - Respuesta de fetch.
 * @returns {Promise<object>}
 */
async function parseJsonSafely(response) {
    try {
        return await response.json();
    } catch (error) {
        return {};
    }
}

/**
 * Solicita un nuevo access token al backend usando la cookie httpOnly de refresh token.
 * Evita solicitudes concurrentes de refresh reutilizando la misma promesa en curso.
 * @returns {Promise<string>} Nuevo access token.
 */
async function refreshAccessToken() {
    if (refreshInFlightPromise) {
        return refreshInFlightPromise;
    }

    refreshInFlightPromise = (async () => {
        const response = await fetch(`${API_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: DEFAULT_HEADERS,
            credentials: 'include'
        });

        const responseData = await parseJsonSafely(response);

        if (!response.ok || !responseData.accessToken) {
            throw new Error(responseData.message || 'No fue posible refrescar la sesión.');
        }

        localStorage.setItem('accessToken', responseData.accessToken);
        localStorage.setItem('isAuthenticated', 'true');

        return responseData.accessToken;
    })();

    try {
        return await refreshInFlightPromise;
    } finally {
        refreshInFlightPromise = null;
    }
}

/**
 * Determina si para una petición protegida corresponde intentar rotación de token.
 * @param {object} args - Parámetros de evaluación.
 * @returns {boolean}
 */
function shouldTryRefresh({ endpoint, isPublic, responseStatus, retryAfterRefresh }) {
    if (isPublic) return false;
    if (retryAfterRefresh) return false;
    if (responseStatus !== 401 && responseStatus !== 403) return false;

    // Evita bucles para endpoints de autenticación.
    return endpoint !== 'auth/login' && endpoint !== 'auth/refresh-token' && endpoint !== 'auth/logout';
}

/**
 * Cierra sesión en backend (revoca cookie refresh) y limpia estado local.
 */
async function performLogout() {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: DEFAULT_HEADERS,
            credentials: 'include'
        });
    } catch (error) {
        // Si falla la petición, igual se limpia sesión local para evitar estado inconsistente.
    } finally {
        clearAuthStorage();
    }
}

/**
 * Función principal y privada que realiza la petición a la API.
 * Maneja la adición de tokens de autenticación y la gestión de errores comunes.
 *
 * @param {string} endpoint - El endpoint específico de la API (ej. 'usuarios', 'productos/1').
 * @param {string} method - El método HTTP a utilizar ('GET', 'POST', 'PUT', 'DELETE').
 * @param {object} [data=null] - El cuerpo de la petición para métodos POST o PUT.
 * @param {boolean} [isPublic=false] - Si es 'true', la petición no incluirá el token de autenticación.
 * @returns {Promise<any>} - Una promesa que se resuelve con la respuesta JSON de la API.
 * @throws {Error} - Lanza un error si la petición falla, para ser capturado por el llamador.
 */
async function fetchAPI(endpoint, method, data = null, isPublic = false, retryAfterRefresh = false) {
    // Configuración inicial de las cabeceras.
    const headers = { ...DEFAULT_HEADERS };
    const config = {
        method,
        headers,
        credentials: 'include'
    };

    // Para rutas protegidas, se añade el token de autenticación.
    if (!isPublic) {
        let token = localStorage.getItem('accessToken');

        if (!token) {
            // Si no existe access token, se intenta recuperar uno usando la cookie refresh.
            try {
                token = await refreshAccessToken();
            } catch (error) {
                clearSessionAndRedirect('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
                throw new Error('Token de autenticación no encontrado.');
            }
        }

        // Se añade el token al header 'Authorization' con el esquema 'Bearer'.
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Si se proporcionan datos (para POST/PUT), se convierten a JSON y se añaden al cuerpo.
    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        // Se realiza la petición fetch a la URL completa.
        const response = await fetch(`${API_URL}/${endpoint}`, config);
        
        // Si el access token expiró, intenta rotación automática una sola vez.
        if (shouldTryRefresh({ endpoint, isPublic, responseStatus: response.status, retryAfterRefresh })) {
            try {
                await refreshAccessToken();
                return await fetchAPI(endpoint, method, data, isPublic, true);
            } catch (error) {
                await performLogout();
                clearSessionAndRedirect('Tu sesión expiró. Inicia sesión nuevamente.');
                throw new Error('No autorizado');
            }
        }
        
        // Se intenta parsear la respuesta como JSON.
        const responseData = await parseJsonSafely(response);

        // Si la respuesta no fue exitosa (ej. status 400, 500), se lanza un error.
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                await performLogout();
                clearSessionAndRedirect('Tu sesión ha expirado o no tienes permisos. Inicia sesión de nuevo.');
                throw new Error('No autorizado');
            }

            // Se usa el mensaje del backend si está disponible, o uno genérico.
            throw new Error(responseData.message || `Error en la petición a ${endpoint}`);
        }

        // Si todo fue exitoso, se devuelve la data.
        return responseData;
    } catch (error) {
        // Se re-lanza el error para que pueda ser manejado por el controlador que originó la llamada.
        // Esto evita mostrar alertas duplicadas y permite un manejo de errores más específico en la UI.
        throw error;
    }
}

/**
 * @description Objeto exportado que proporciona una interfaz simplificada y semántica
 * para realizar peticiones a la API.
 */
export const api = {
    // Peticiones GET (protegidas por defecto)
    get: (endpoint) => fetchAPI(endpoint, 'GET'),
    // Peticiones POST (protegidas por defecto)
    post: (endpoint, data) => fetchAPI(endpoint, 'POST', data),
    // Peticiones PUT (protegidas por defecto)
    put: (endpoint, data) => fetchAPI(endpoint, 'PUT', data),
    // Peticiones DELETE (protegidas por defecto)
    delete: (endpoint) => fetchAPI(endpoint, 'DELETE'),
    
    // Métodos específicos para rutas públicas que no requieren token.
    publicGet: (endpoint) => fetchAPI(endpoint, 'GET', null, true),
    publicPost: (endpoint, data) => fetchAPI(endpoint, 'POST', data, true),
    logout: () => performLogout()
};
