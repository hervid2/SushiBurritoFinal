// =================================================================
// ARCHIVO: src/middleware/rateLimit.middleware.js
// ROL: Limitar intentos por IP para endpoints sensibles de autenticación.
// =================================================================

import { env } from '../config/env.js';

const bucketByIp = new Map();

function clearExpiredBuckets(now, windowMs) {
    for (const [ip, bucket] of bucketByIp.entries()) {
        if (now - bucket.windowStart >= windowMs) {
            bucketByIp.delete(ip);
        }
    }
}

export function createAuthRateLimiter() {
    const windowMs = env.authRateLimitWindowMs;
    const maxRequests = env.authRateLimitMaxRequests;

    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const now = Date.now();

        clearExpiredBuckets(now, windowMs);

        const currentBucket = bucketByIp.get(ip);

        if (!currentBucket || (now - currentBucket.windowStart) >= windowMs) {
            bucketByIp.set(ip, { count: 1, windowStart: now });
            next();
            return;
        }

        currentBucket.count += 1;

        if (currentBucket.count > maxRequests) {
            const retryAfterSeconds = Math.ceil((windowMs - (now - currentBucket.windowStart)) / 1000);
            res.setHeader('Retry-After', String(retryAfterSeconds));
            res.status(429).send({ message: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.' });
            return;
        }

        next();
    };
}

export function resetRateLimiterState() {
    bucketByIp.clear();
}
