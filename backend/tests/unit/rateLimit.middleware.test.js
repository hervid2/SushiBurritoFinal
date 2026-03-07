import { describe, expect, it, vi } from 'vitest';
import { createAuthRateLimiter, resetRateLimiterState } from '../../src/middleware/rateLimit.middleware.js';

function createMockResponse() {
    return {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
    };
}

describe('auth rate limiter', () => {
    it('permite peticiones bajo el límite configurado', () => {
        resetRateLimiterState();

        const limiter = createAuthRateLimiter();
        const req = { ip: '127.0.0.1', headers: {} };
        const res = createMockResponse();
        const next = vi.fn();

        limiter(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('bloquea cuando se supera el límite por IP', () => {
        resetRateLimiterState();

        const limiter = createAuthRateLimiter();
        const req = { ip: '10.0.0.8', headers: {} };
        const res = createMockResponse();
        const next = vi.fn();

        for (let i = 0; i < 25; i += 1) {
            limiter(req, res, next);
        }

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.send).toHaveBeenCalled();
    });
});
