import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession, mockUnauthorizedSession } from './helpers/auth';

test.describe('Brightloop Phase 2 Authentication & Route Protection Tests', () => {
  test('1. Unauthenticated users visiting protected routes are redirected to /login', async ({ page }) => {
    await mockUnauthorizedSession(page);
    // Attempt to access dashboard directly without session
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);

    // Verify Login page UI elements
    await expect(page.getByRole('heading', { name: 'Sign in to Brightloop' })).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('2. Registration page enforces official password requirements', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create Customer Account' })).toBeVisible();

    const passwordInput = page.getByLabel('Password', { exact: true });
    const confirmPasswordInput = page.getByLabel('Confirm Password', { exact: true });
    const submitBtn = page.getByRole('button', { name: 'Register Account' });

    // Initially button is disabled
    await expect(submitBtn).toBeDisabled();

    // Fill valid name and email
    await page.getByLabel('Full Name / Company Name').fill('Test Customer');
    await page.getByLabel('Email Address').fill('customer@test.com');

    // Type 8-char invalid password (fails >8 chars rule)
    await passwordInput.fill('Pass123!');
    await confirmPasswordInput.fill('Pass123!');
    await expect(page.getByText('More than 8 characters (9+)')).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // Type 9-char valid password (>8 chars, uppercase, lowercase, special)
    await passwordInput.fill('Password123!');
    await confirmPasswordInput.fill('Password123!');
    await expect(submitBtn).toBeEnabled();
  });

  test('3. Forgot password page renders recovery flow', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
    await expect(page.getByLabel('Registered Email Address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Reset Link' })).toBeVisible();

    // Back to Sign In link works
    await page.getByRole('link', { name: 'Return to Sign In' }).click();
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('4. Authenticated admin session accesses dashboard and sees role-aware navigation', async ({ page }) => {
    // Inject verified server-session mock
    await mockAuthenticatedSession(page, {
      id: 'admin-usr-1',
      email: 'admin@brightloop.local',
      name: 'Amarnadh (Admin)',
      role: 'admin',
    });

    await page.goto('/dashboard');

    // Dashboard should render without redirecting
    await expect(page.getByRole('heading', { name: 'Subscription & Revenue Insights' })).toBeVisible();

    // Role-authorized sidebar items for Admin should be visible
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Products' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Subscriptions' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Invoices' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

    // Verify verified role badge in header
    await expect(page.getByText('admin', { exact: false }).first()).toBeVisible();
  });

  test('5. Authenticated customer session is restricted from admin routes and guided to portal', async ({ page }) => {
    // Inject verified customer session
    await mockAuthenticatedSession(page, {
      id: 'cust-usr-88',
      email: 'billing@acme.com',
      name: 'Acme Corp',
      role: 'customer',
    });

    // Customer attempts to navigate directly to Admin dashboard '/dashboard'
    await page.goto('/dashboard');

    // ProtectedRoute should enforce role restriction and redirect customer to '/portal'
    await expect(page).toHaveURL(/.*\/portal/);
    await expect(page.getByRole('heading', { name: 'Self-Service Customer Portal' })).toBeVisible();

    // Admin-only sections should NOT be rendered in customer's sidebar
    await expect(page.getByRole('link', { name: 'Settings' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Products' })).not.toBeVisible();
  });

  test('6. User sign out clears session and redirects to login', async ({ page }) => {
    await mockAuthenticatedSession(page, {
      id: 'staff-1',
      email: 'staff@brightloop.local',
      name: 'Staff Member',
      role: 'staff',
    });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Subscription & Revenue Insights' })).toBeVisible();

    // Open user profile dropdown and click Sign Out
    await page.getByText('Staff Member').click();
    await page.getByRole('button', { name: 'Sign Out' }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);

    // Verify localStorage cleared
    const token = await page.evaluate(() => window.localStorage.getItem('brightloop_auth_token'));
    expect(token).toBeNull();
  });
});

