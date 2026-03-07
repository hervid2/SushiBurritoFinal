import { describe, expect, it } from 'vitest';
import { validateEmail, validatePassword } from './auth.js';

describe('auth helpers', () => {
    it('valida correos con formato correcto', () => {
        expect(validateEmail('admin@sushiburrito.com')).toBe(true);
        expect(validateEmail('correo-invalido')).toBe(false);
    });

    it('valida fortaleza mínima de contraseña', () => {
        expect(validatePassword('Abcd1234!')).toBe(true);
        expect(validatePassword('1234')).toBe(false);
    });
});
