import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockUnauthorizedSession } from './helpers/auth';

test.describe('Brightloop Frontend Foundation Smoke Tests', () => {
  test('1. Public landing page launches with logo, hero, and AI Assistant launcher without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('ERR_CONNECTION_REFUSED')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Verify brand presence on public landing page
    await expect(page.locator('text=Brightloop').first()).toBeVisible();

    // Verify hero value proposition
    await expect(page.getByRole('heading', { name: 'Automated Subscription Billing & Customer Intelligence' })).toBeVisible();

    // Verify floating AI assistant launcher widget is visible
    await expect(page.getByRole('button', { name: 'Open AI Assistant' })).toBeVisible();

    // Verify no runtime console errors
    expect(consoleErrors).toEqual([]);
  });

  test('2. Navigation to Customer Services displays FAQs and support request UI', async ({ page }) => {
    await page.goto('/customer-services');

    // Header & FAQs
    await expect(page.getByRole('heading', { name: 'Customer Services & Help Center' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeVisible();

    // Verify Raise a Support Request form
    await expect(page.getByRole('heading', { name: 'Raise a Support Request' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Support Request' })).toBeVisible();
  });

  test('3. Authenticated Admin accesses /dashboard and navigates backoffice entities smoothly', async ({ page }) => {
    await mockAuthenticatedSession(page, {
      id: 'admin-smoke-1',
      email: 'admin@brightloop.local',
      name: 'Admin',
      role: 'admin',
    });

    await page.goto('/dashboard');

    // Verify dashboard heading
    await expect(page.getByRole('heading', { name: 'Subscription & Revenue Insights' })).toBeVisible();

    // Navigate to Subscriptions
    const subscriptionsLink = page.getByRole('link', { name: 'Subscriptions', exact: true });
    await subscriptionsLink.click();
    await expect(page).toHaveURL(/.*\/subscriptions/);
    await expect(page.getByRole('heading', { name: 'Subscriptions', exact: true })).toBeVisible();

    // Navigate to Invoices
    const invoicesLink = page.getByRole('link', { name: 'Invoices', exact: true });
    await invoicesLink.click();
    await expect(page).toHaveURL(/.*\/invoices/);
    await expect(page.getByRole('heading', { name: 'Invoices & Scheduled Billing', exact: true })).toBeVisible();

    // Navigate to Customer Portal
    const portalLink = page.getByRole('link', { name: /Customer Portal/ });
    await portalLink.click();
    await expect(page).toHaveURL(/.*\/portal/);
    await expect(page.getByRole('heading', { name: 'Self-Service Customer Portal' })).toBeVisible();
  });
});
