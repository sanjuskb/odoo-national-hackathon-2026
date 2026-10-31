import { test, expect } from '@playwright/test';
import { mockAuthenticatedSession } from './helpers/auth';

test.describe('Brightloop Phase 3 Products & Recurring Plans Tests', () => {
  // Common test fixture injecting verified Admin session and intercepting API calls with verified shapes
  test.beforeEach(async ({ page }) => {
    // Inject verified admin session
    await mockAuthenticatedSession(page, {
      id: 'admin-1',
      email: 'admin@brightloop.local',
      name: 'Amarnadh (Admin)',
      role: 'admin',
    }, 'mock_admin_token');

    // Mock GET /api/v1/products with official PS fixtures
    await page.route('**/api/v1/products**', async (route) => {
      if (route.request().method() === 'GET') {
        const url = new URL(route.request().url());
        // If single product fetch /api/v1/products/:id
        if (url.pathname.match(/\/api\/v1\/products\/[a-zA-Z0-9_-]+$/)) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                product: {
                  id: 'prod-core-1',
                  name: 'Brightloop Core Suite',
                  type: 'service',
                  sales_price: '1200.00',
                  cost_price: '350.00',
                  notes: 'Primary enterprise subscription product',
                  variants: [
                    {
                      id: 'var-odoo-1',
                      product_id: 'prod-core-1',
                      name: 'Odoo Brand Edition',
                      price_adjustment: '560.00',
                    },
                  ],
                },
              },
              message: 'Product retrieved',
            }),
          });
        }

        // List endpoint
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: 'prod-core-1',
                  name: 'Brightloop Core Suite',
                  type: 'service',
                  sales_price: '1200.00',
                  cost_price: '350.00',
                  notes: 'Primary enterprise subscription product',
                  created_at: '2026-10-31T10:00:00.000Z',
                },
                {
                  id: 'prod-addon-2',
                  name: 'Analytics Pro Add-on',
                  type: 'service',
                  sales_price: '250.00',
                  cost_price: '60.00',
                  notes: 'Real-time billing telemetry',
                  created_at: '2026-10-31T10:30:00.000Z',
                },
              ],
              pagination: {
                page: 1,
                page_size: 10,
                total_items: 2,
                total_pages: 1,
              },
            },
            message: 'Products retrieved',
          }),
        });
      }
      return route.continue();
    });

    // Mock GET /api/v1/plans with official PS fixtures
    await page.route('**/api/v1/plans**', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: 'plan-monthly-1',
                  product_id: 'prod-core-1',
                  price: '120.00',
                  frequency: 'monthly',
                  min_quantity: 1,
                  available_from: '2026-10-01T00:00:00.000Z',
                  available_until: '2027-10-01T00:00:00.000Z',
                  auto_close: false,
                  allow_early_close: true,
                  allow_pause: true,
                  allow_renew: true,
                  created_at: '2026-10-31T10:00:00.000Z',
                },
                {
                  id: 'plan-yearly-2',
                  product_id: 'prod-core-1',
                  price: '1200.00',
                  frequency: 'yearly',
                  min_quantity: 5,
                  available_from: '2026-10-01T00:00:00.000Z',
                  available_until: null,
                  auto_close: false,
                  allow_early_close: true,
                  allow_pause: false,
                  allow_renew: true,
                  created_at: '2026-10-31T10:00:00.000Z',
                },
              ],
              pagination: {
                page: 1,
                page_size: 10,
                total_items: 2,
                total_pages: 1,
              },
            },
            message: 'Plans retrieved',
          }),
        });
      }
      return route.continue();
    });

    // Mock server price preview endpoint GET /api/v1/products/:id/price
    await page.route('**/api/v1/products/*/price**', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            unit_price: '1760.00',
            total_price: '3520.00',
            currency: 'USD',
          },
          message: 'Price calculated by backend',
        }),
      });
    });
  });

  test('1. Products page renders catalog with sales and cost price visible to admin', async ({ page }) => {
    await page.goto('/products');

    // Page titles and headers
    await expect(page.getByRole('heading', { name: 'Products & Product Variants' })).toBeVisible();

    // Verify products table rendered
    await expect(page.getByText('Brightloop Core Suite')).toBeVisible();
    await expect(page.getByText('Analytics Pro Add-on')).toBeVisible();

    // Verify prices displayed (Sales and Cost for admin)
    await expect(page.getByText('$1,200.00')).toBeVisible();
    await expect(page.getByText('$350.00')).toBeVisible();

    // Admin should see Create Product button
    await expect(page.getByRole('button', { name: 'Create Product' })).toBeVisible();
  });

  test('2. Product creation drawer opens and contains accessible form fields', async ({ page }) => {
    await page.goto('/products');

    await page.getByRole('button', { name: 'Create Product' }).click();

    // Drawer visible
    await expect(page.getByRole('heading', { name: 'Create New Product' })).toBeVisible();
    await expect(page.getByLabel('Product Name')).toBeVisible();
    await expect(page.getByLabel('Sales Price ($)')).toBeVisible();
    await expect(page.getByLabel('Cost Price ($)')).toBeVisible();
  });

  test('3. Variant management sheet displays price adjustments and queries server pricing', async ({ page }) => {
    await page.goto('/products');

    // Click Manage Variants on first product
    await page.getByRole('button', { name: 'Manage Variants' }).first().click();

    // Verify variant sheet opens
    await expect(page.getByText('Registered Product Variants')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Odoo Brand Edition' })).toBeVisible();
    await expect(page.getByText('+$560.00')).toBeVisible();

    // Verify Server Pricing Calculation Check section
    await expect(page.getByText('Server Pricing Calculation Check')).toBeVisible();
    await page.getByRole('button', { name: 'Query Backend Pricing' }).click();

    // Assert that server-calculated total is presented
    await expect(page.getByText('$1760.00')).toBeVisible();
    await expect(page.getByText('$3520.00 USD')).toBeVisible();
  });

  test('4. Plans page displays frequency filters and associated product names', async ({ page }) => {
    await page.goto('/plans');

    await expect(page.getByRole('heading', { name: 'Recurring Billing Plans' })).toBeVisible();

    // Frequency filter pills
    await expect(page.getByRole('button', { name: 'all' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'monthly' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'yearly' })).toBeVisible();

    // Table rows showing product name resolved via lookup
    await expect(page.getByRole('cell', { name: 'Brightloop Core Suite' }).first()).toBeVisible();
    await expect(page.getByText('$120.00')).toBeVisible();
    await expect(page.getByText('$1,200.00')).toBeVisible();

    // Badges for policies
    await expect(page.getByText('Renewable').first()).toBeVisible();
    await expect(page.getByText('Pausable').first()).toBeVisible();

    // Admin Create Plan button
    await expect(page.getByRole('button', { name: 'Create Plan' })).toBeVisible();
  });

  test('5. Plan creation sheet presents policy toggles and product associations', async ({ page }) => {
    await page.goto('/plans');

    await page.getByRole('button', { name: 'Create Plan' }).click();

    await expect(page.getByRole('heading', { name: 'Configure New Recurring Plan' })).toBeVisible();
    await expect(page.getByLabel('Parent Product')).toBeVisible();
    await expect(page.getByLabel('Recurring Price ($)')).toBeVisible();
    await expect(page.getByLabel('Minimum Quantity')).toBeVisible();

    // Verify policy toggles
    await expect(page.getByText('Auto-close plan when expiry date ends')).toBeVisible();
    await expect(page.getByText('Allow customer to pause subscription')).toBeVisible();
    await expect(page.getByText('Allow automatic or manual plan renewal')).toBeVisible();
  });
});

