import { Page } from '@playwright/test';
import { UserRole } from '../src/types';

export interface MockUserSession {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  full_name?: string;
}

// Common test helper to set up server-authenticated session in Playwright tests.
// Injects token into localStorage and intercepts /api/v1/auth/me to return verified user profile.
export async function mockAuthenticatedSession(
  page: Page,
  user: MockUserSession,
  token = 'mock_verified_token'
) {
  const fullName = user.full_name || user.name || user.email.split('@')[0];

  // Intercept GET /api/v1/auth/me
  await page.route('**/api/v1/auth/me', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: fullName,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            full_name: fullName,
          },
        },
        message: 'Current user profile',
      }),
    });
  });

  // Prepopulate local storage before document load
  await page.addInitScript(
    ({ t, u }) => {
      window.localStorage.setItem('brightloop_auth_token', t);
      window.localStorage.setItem('brightloop_user_session', JSON.stringify(u));
    },
    {
      t: token,
      u: {
        id: user.id,
        email: user.email,
        name: fullName,
        role: user.role,
      },
    }
  );
}

/**
 * Common test helper to mock unauthorized session (token rejected or 401).
 */
export async function mockUnauthorizedSession(page: Page) {
  await page.route('**/api/v1/auth/me', async (route) => {
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        data: null,
        message: 'Unauthorized - invalid or expired token',
      }),
    });
  });
}
