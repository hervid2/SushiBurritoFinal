// =================================================================
// ARCHIVO: src/config/env.js
// ROL: Centralizar y validar variables de entorno para evitar
//      configuraciones inconsistentes entre entornos.
// =================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

function parseBoolean(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    return String(value).toLowerCase() === 'true';
}

function parseNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeUrl(url) {
    return String(url || '').trim().replace(/\/$/, '');
}

function parseAllowedOrigins() {
    const rawValue = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;

    return rawValue
        .split(',')
        .map((origin) => normalizeUrl(origin))
        .filter(Boolean);
}

export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseNumber(process.env.PORT, 3000),
    frontendOrigins: parseAllowedOrigins(),
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || (process.env.NODE_ENV === 'test' ? 'test_access_secret' : undefined),
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || (process.env.NODE_ENV === 'test' ? 'test_refresh_secret' : undefined),
    refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'refreshToken',
    accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.TOKEN_EXPIRATION || '15m',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || process.env.REFRESH_EXPIRATION || '7d',
    refreshTokenMaxAgeMs: parseNumber(process.env.REFRESH_TOKEN_MAX_AGE_MS, 7 * 24 * 60 * 60 * 1000),
    refreshCookieSameSite: process.env.REFRESH_COOKIE_SAME_SITE || 'lax',
    refreshCookieSecure: parseBoolean(process.env.REFRESH_COOKIE_SECURE, process.env.NODE_ENV === 'production'),
    resetPasswordUrl: normalizeUrl(process.env.RESET_PASSWORD_URL || `${DEFAULT_FRONTEND_URL}/#/reset-password`),
    authRateLimitWindowMs: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    authRateLimitMaxRequests: parseNumber(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 20),
};

export function getPrimaryFrontendOrigin() {
    return env.frontendOrigins[0] || DEFAULT_FRONTEND_URL;
}

export function validateEnvironment() {
    if (env.nodeEnv === 'test' || process.env.SKIP_ENV_VALIDATION === 'true') {
        return;
    }

    const requiredVariables = [
        'DB_HOST',
        'DB_USER',
        'DB_PASSWORD',
        'DB_NAME',
        'ACCESS_TOKEN_SECRET',
        'REFRESH_TOKEN_SECRET',
        'FRONTEND_URL',
    ];

    const optionalInDevelopment = ['EMAIL_SERVICE', 'EMAIL_USER', 'EMAIL_PASSWORD'];

    if (env.nodeEnv === 'production') {
        requiredVariables.push(...optionalInDevelopment);
    }

    const missingVariables = requiredVariables.filter((variableName) => {
        const value = process.env[variableName];
        return value === undefined || value === null || String(value).trim() === '';
    });

    if (missingVariables.length > 0) {
        throw new Error(
            `Faltan variables de entorno requeridas: ${missingVariables.join(', ')}.`
        );
    }
}
