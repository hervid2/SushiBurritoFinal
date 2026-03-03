import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { applySecurityHeaders } from '../../src/middleware/securityHeaders.middleware.js';
import { createAuthRateLimiter, resetRateLimiterState } from '../../src/middleware/rateLimit.middleware.js';

function buildAuthApp() {
    const app = express();
    app.use(express.json());
    app.use(applySecurityHeaders);

    const authLimiter = createAuthRateLimiter();
    app.post('/api/auth/login', authLimiter, (req, res) => {
        res.status(200).send({ ok: true });
    });

    return app;
}

describe('integración de hardening para auth', () => {
    it('aplica cabeceras de seguridad y limita ráfagas de login', async () => {
        resetRateLimiterState();

        const app = buildAuthApp();

        const firstResponse = await request(app)
            .post('/api/auth/login')
            .send({ correo: 'demo@sushi.com', contraseña: 'secret' });

        expect(firstResponse.status).toBe(200);
        expect(firstResponse.headers['x-content-type-options']).toBe('nosniff');

        let lastResponse = firstResponse;

        for (let i = 0; i < 25; i += 1) {
            lastResponse = await request(app)
                .post('/api/auth/login')
                .send({ correo: 'demo@sushi.com', contraseña: 'secret' });
        }

        expect(lastResponse.status).toBe(429);
        expect(lastResponse.headers['retry-after']).toBeDefined();
    });
});
