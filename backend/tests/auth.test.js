import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setInjectedClients, resetInjectedClients } from '../src/lib/supabase.js';
import { createSupabaseMock } from './mocks/supabase.mock.js';

describe('Phase 1 Auth Test Suite (Supabase Client Mocked)', () => {
  let mock;

  beforeEach(() => {
    mock = createSupabaseMock();
    setInjectedClients({
      admin: mock.adminClient,
      publicClient: mock.publicClient,
    });
  });

  afterEach(() => {
    resetInjectedClients();
    mock.reset();
  });

  // -------------------------------------------------------------------------
  // Case 2: Register validation rejections
  // -------------------------------------------------------------------------
  describe('Case 2: POST /api/v1/auth/register validation', () => {
    it('rejects an invalid email format', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid-email-format',
        password: 'ValidPassword123!',
        full_name: 'Test Customer',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
        ])
      );
    });

    it('rejects an 8-character password (must be >8 characters)', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'customer@example.com',
        password: 'Pass123!', // Exactly 8 characters
        full_name: 'Test Customer',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ])
      );
    });

    it('rejects a password without uppercase characters', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'customer@example.com',
        password: 'password123!', // No uppercase
        full_name: 'Test Customer',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ])
      );
    });

    it('rejects a password without lowercase characters', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'customer@example.com',
        password: 'PASSWORD123!', // No lowercase
        full_name: 'Test Customer',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ])
      );
    });

    it('rejects a password without a special character', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'customer@example.com',
        password: 'Password1234', // No special character
        full_name: 'Test Customer',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ])
      );
    });

    it('rejects missing or empty full_name', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'customer@example.com',
        password: 'Password123!',
        full_name: '   ',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'full_name' }),
        ])
      );
    });
  });

  // -------------------------------------------------------------------------
  // Case 3: Register accepts valid input and role is ALWAYS 'customer'
  // -------------------------------------------------------------------------
  describe('Case 3: Role assignment integrity on registration', () => {
    it('accepts valid 9+ char password and forces role customer even if client sends role: admin', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'alice@example.com',
        password: 'ValidPassword123!', // 17 chars, upper + lower + special
        full_name: 'Alice Customer',
        role: 'admin', // Malicious attempt to self-grant admin
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.role).toBe('customer'); // Role is strictly customer
    });
  });

  // -------------------------------------------------------------------------
  // Case 4: Duplicate email returns 409
  // -------------------------------------------------------------------------
  describe('Case 4: Duplicate email rejection', () => {
    it('returns 409 when registering an already registered email', async () => {
      // First registration
      await request(app).post('/api/v1/auth/register').send({
        email: 'bob@example.com',
        password: 'ValidPassword123!',
        full_name: 'Bob Original',
      });

      // Second registration with same email
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'bob@example.com',
        password: 'AnotherPassword123!',
        full_name: 'Bob Duplicate',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  // -------------------------------------------------------------------------
  // Case 5: Login with correct/wrong password
  // -------------------------------------------------------------------------
  describe('Case 5: POST /api/v1/auth/login', () => {
    beforeEach(() => {
      mock.seedUser({
        id: 'cust-1',
        email: 'carol@example.com',
        password: 'SecretPassword123!',
        full_name: 'Carol Customer',
        role: 'customer',
      });
    });

    it('returns 401 with generic message on wrong password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'carol@example.com',
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('returns tokens and role on successful login', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'carol@example.com',
        password: 'SecretPassword123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.access_token).toBeDefined();
      expect(res.body.data.refresh_token).toBeDefined();
      expect(res.body.data.user.role).toBe('customer');
      expect(res.body.data.user.email).toBe('carol@example.com');
    });
  });

  // -------------------------------------------------------------------------
  // Case 6: Forgot-password identical response
  // -------------------------------------------------------------------------
  describe('Case 6: POST /api/v1/auth/forgot-password', () => {
    it('returns identical success response for existing and non-existing email', async () => {
      mock.seedUser({
        id: 'user-exists',
        email: 'exists@example.com',
      });

      const resExists = await request(app).post('/api/v1/auth/forgot-password').send({
        email: 'exists@example.com',
      });

      const resMissing = await request(app).post('/api/v1/auth/forgot-password').send({
        email: 'does-not-exist@example.com',
      });

      expect(resExists.status).toBe(200);
      expect(resMissing.status).toBe(200);
      expect(resExists.body).toEqual(resMissing.body);
      expect(resExists.body.message).toBe(
        'If your email is registered, you will receive a password reset link.'
      );
    });
  });

  // -------------------------------------------------------------------------
  // Case 7: GET /api/v1/auth/me token handling
  // -------------------------------------------------------------------------
  describe('Case 7: GET /api/v1/auth/me verification', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when token is malformed', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic 123456');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when token is invalid or expired', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-xyz');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with user profile and verified role on valid token', async () => {
      const { token } = mock.seedUser({
        id: 'staff-42',
        email: 'staff@brightloop.local',
        role: 'staff',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('staff-42');
      expect(res.body.data.email).toBe('staff@brightloop.local');
      expect(res.body.data.role).toBe('staff');
    });
  });

  // -------------------------------------------------------------------------
  // Case 8: Staff creation RBAC (Admin only)
  // -------------------------------------------------------------------------
  describe('Case 8: Staff creation RBAC', () => {
    let customerToken;
    let staffToken;
    let adminToken;

    beforeEach(() => {
      customerToken = mock.seedUser({ id: 'c-1', email: 'c@t.com', role: 'customer' }).token;
      staffToken = mock.seedUser({ id: 's-1', email: 's@t.com', role: 'staff' }).token;
      adminToken = mock.seedUser({ id: 'a-1', email: 'a@t.com', role: 'admin' }).token;
    });

    it('denies customer access to staff creation (403)', async () => {
      const res = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          email: 'newstaff@example.com',
          password: 'Password123!',
          full_name: 'New Staff',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('denies staff member access to staff creation (403)', async () => {
      const res = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          email: 'newstaff@example.com',
          password: 'Password123!',
          full_name: 'New Staff',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows admin to create staff at /api/v1/staff', async () => {
      const res = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newstaff@brightloop.local',
          password: 'ValidPassword123!',
          full_name: 'New Staff Member',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('staff');
      expect(res.body.data.user.email).toBe('newstaff@brightloop.local');
    });

    it('also allows admin at alias /api/v1/admin/staff', async () => {
      const res = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'anotherstaff@brightloop.local',
          password: 'ValidPassword123!',
          full_name: 'Another Staff',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('staff');
    });

    it('rejects invalid password when admin creates staff', async () => {
      const res = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'badpasswordstaff@brightloop.local',
          password: 'short', // invalid password
          full_name: 'Invalid Staff',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Case 9: requireSelfOrStaff isolation
  // -------------------------------------------------------------------------
  describe('Case 9: requireSelfOrStaff customer isolation', () => {
    let customerAToken;
    let customerBToken;
    let staffToken;
    let adminToken;

    beforeEach(() => {
      customerAToken = mock.seedUser({ id: 'user-A', email: 'a@c.com', role: 'customer' }).token;
      customerBToken = mock.seedUser({ id: 'user-B', email: 'b@c.com', role: 'customer' }).token;
      staffToken = mock.seedUser({ id: 'user-S', email: 's@c.com', role: 'staff' }).token;
      adminToken = mock.seedUser({ id: 'user-Adm', email: 'adm@c.com', role: 'admin' }).token;
    });

    it('forbids Customer A from accessing Customer B resource (403)', async () => {
      const res = await request(app)
        .get('/api/v1/test/users/user-B')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows Customer A to access their own resource (200)', async () => {
      const res = await request(app)
        .get('/api/v1/test/users/user-A')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessed).toBe('user-A');
    });

    it('allows Staff to access any customer resource (200)', async () => {
      const res = await request(app)
        .get('/api/v1/test/users/user-A')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessed).toBe('user-A');
    });

    it('allows Admin to access any customer resource (200)', async () => {
      const res = await request(app)
        .get('/api/v1/test/users/user-B')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessed).toBe('user-B');
    });
  });

  // -------------------------------------------------------------------------
  // Case 10: Role sent in client token user_metadata is ignored
  // -------------------------------------------------------------------------
  describe('Case 10: Client-side user_metadata role spoofing is ignored', () => {
    it('ignores role in user_metadata and uses roleStore role', async () => {
      const { token } = mock.seedUser({
        id: 'spoof-user-1',
        email: 'spoof@example.com',
        role: 'customer', // True role in app_metadata
        user_metadata: { role: 'admin' }, // Spoofed claim in user_metadata
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('customer'); // Must be customer, NOT admin
    });
  });

  // -------------------------------------------------------------------------
  // Case 11: Leaking prevention: passwords, tokens, keys never in logs/bodies
  // -------------------------------------------------------------------------
  describe('Case 11: Security leak prevention', () => {
    it('ensures register response does not contain password or token', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'safe@example.com',
        password: 'ValidPassword123!',
        full_name: 'Safe User',
      });

      expect(res.status).toBe(201);
      const responseString = JSON.stringify(res.body);
      expect(responseString).not.toContain('ValidPassword123!');
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('ensures requestLogger does not leak passwords, tokens, or auth headers to console', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await request(app)
        .post('/api/v1/auth/login')
        .set('Authorization', 'Bearer super-secret-bearer-token')
        .send({
          email: 'safe@example.com',
          password: 'SecretPassword123!',
        });

      // Verify each logged line
      for (const call of consoleSpy.mock.calls) {
        const loggedText = call.join(' ');
        expect(loggedText).not.toContain('SecretPassword123!');
        expect(loggedText).not.toContain('super-secret-bearer-token');
      }

      consoleSpy.mockRestore();
    });
  });
});
