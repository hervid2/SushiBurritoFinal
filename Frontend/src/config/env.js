// =================================================================
// ARCHIVO: src/config/env.js
// ROL: Centralizar variables de entorno del cliente (Vite).
// =================================================================

function normalizeBaseUrl(url, fallbackValue) {
    const normalized = String(url || fallbackValue).trim();
    return normalized.replace(/\/$/, '');
}

const viteEnv = import.meta.env || {};

export const env = {
    apiUrl: normalizeBaseUrl(viteEnv.VITE_API_URL, 'http://localhost:3000/api'),
    socketUrl: normalizeBaseUrl(viteEnv.VITE_SOCKET_URL, 'http://localhost:3000'),
};
