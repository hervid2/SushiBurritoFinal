import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../../src/middleware/auth.middleware.js';
import { env } from '../../src/config/env.js';

function createMockResponse() {
    const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
    };

    return res;
}

describe('verifyToken middleware', () => {
    it('rechaza solicitudes sin token con 403', () => {
        const req = { headers: {} };
        const res = createMockResponse();
        const next = vi.fn();

        verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('acepta token válido y ejecuta next()', () => {
        const signedToken = jwt.sign({ id: 101 }, env.accessTokenSecret);
        const req = { headers: { authorization: `Bearer ${signedToken}` } };
        const res = createMockResponse();
        const next = vi.fn();

        verifyToken(req, res, next);

        expect(req.userId).toBe(101);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});
