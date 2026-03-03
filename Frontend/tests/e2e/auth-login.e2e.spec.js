import { expect, test } from '@playwright/test';

test('login e2e: usuario administrador entra y navega al dashboard', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 1,
                nombre: 'Admin Demo',
                rol: 'administrador',
                accessToken: 'token_demo_e2e',
            }),
        });
    });

    await page.goto('/#/login');

    await page.fill('#login-email', 'admin@sushiburrito.com');
    await page.fill('#login-password', 'Secret123!');
    await page.click('#login-form button[type="submit"]');

    await expect(page).toHaveURL(/#\/admin\/dashboard/);

    await expect.poll(async () => {
        return await page.evaluate(() => localStorage.getItem('isAuthenticated'));
    }).toBe('true');

    await expect.poll(async () => {
        return await page.evaluate(() => localStorage.getItem('userRole'));
    }).toBe('administrador');
});
