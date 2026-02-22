// =================================================================
// ARCHIVO: src/helpers/socketClient.js
// ROL: Cliente singleton de Socket.IO para el Frontend.
//      Se conecta usando el accessToken almacenado en localStorage.
//      Si el token expira (manejo estricto), limpia la sesión y redirige al login.
// =================================================================

import { io } from 'socket.io-client';
import { showAlert } from './alerts.js';

const SOCKET_URL = 'http://localhost:3000';

let socketInstance = null;
let socketHandlersRegistrados = false;

/**
 * @description Limpia la sesión local del navegador y redirige al login.
 *              Se usa en un manejo estricto cuando el servidor rechaza el token.
 * @returns {void}
 */
function clearSessionAndRedirectToLogin() {
    try {
        showAlert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'error');
    } catch (error) {
        console.error(error);
    }

    // Se limpia la sesión para evitar estados inconsistentes.
    localStorage.clear();
    window.location.hash = '/login';
    window.location.reload();
}

/**
 * @description Registra handlers globales del socket (una sola vez por instancia).
 *              Principalmente controla errores de autenticación para forzar logout.
 * @param {import('socket.io-client').Socket} socket - Instancia del socket.
 * @returns {void}
 */
function registerGlobalHandlers(socket) {
    if (socketHandlersRegistrados) return;

    socket.on('connect_error', (err) => {
        const mensaje = (err && err.message) ? err.message.toLowerCase() : '';

        // Manejo estricto: si hay problemas de autenticación, se fuerza logout.
        if (mensaje.includes('token') || mensaje.includes('jwt') || mensaje.includes('unauthorized') || mensaje.includes('no autorizado')) {
            disconnectSocket();
            clearSessionAndRedirectToLogin();
            return;
        }

        console.error('Error de conexión Socket.IO:', err?.message || err);
    });

    socketHandlersRegistrados = true;
}

/**
 * @description Crea (o reutiliza) la conexión global de Socket.IO.
 *              Toma el token desde localStorage y lo envía en el handshake.
 * @returns {import('socket.io-client').Socket|null} - Retorna el socket si hay token, o null si no hay sesión.
 */
export function connectSocket() {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        return null;
    }

    if (socketInstance && socketInstance.connected) {
        return socketInstance;
    }

    if (socketInstance) {
        try {
            socketInstance.connect();
            return socketInstance;
        } catch (error) {
            console.error(error);
        }
    }

    socketHandlersRegistrados = false;

    socketInstance = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        autoConnect: true,
    });

    registerGlobalHandlers(socketInstance);

    return socketInstance;
}

/**
 * @description Retorna la instancia actual del socket (si existe).
 * @returns {import('socket.io-client').Socket|null}
 */
export function getSocket() {
    return socketInstance;
}

/**
 * @description Desconecta el socket y limpia listeners para evitar fugas/duplicados.
 * @returns {void}
 */
export function disconnectSocket() {
    if (!socketInstance) return;

    try {
        socketInstance.removeAllListeners();
        socketInstance.disconnect();
    } catch (error) {
        console.error(error);
    } finally {
        socketInstance = null;
        socketHandlersRegistrados = false;
    }
}
