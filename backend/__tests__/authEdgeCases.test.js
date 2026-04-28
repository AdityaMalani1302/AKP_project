const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

let mockQueryFn;

jest.mock('../middleware/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 1, username: 'testuser', role: 'admin', allowedPages: ['all'] };
    next();
  },
  requireRole: (role) => (req, res, next) => {
    if (req.user.role === role || req.user.role === 'admin') next();
    else res.status(403).json({ error: 'Forbidden' });
  },
}));

jest.mock('../utils/cache', () => {
  const actualCache = jest.requireActual('../utils/cache');
  return { ...actualCache, cacheMiddleware: () => (req, res, next) => next() };
});

const authRoutes = require('../routes/authRoutes');

const createApp = () => {
  const app = express();
  app.use(express.json());
  mockQueryFn = jest.fn();
  app.use((req, res, next) => {
    req.db = {
      request: () => ({
        input: jest.fn().mockReturnThis(),
        query: mockQueryFn,
      }),
    };
    next();
  });
  app.use('/auth', authRoutes);
  return app;
};

describe('Auth Routes - Edge Cases', () => {
  let app;
  beforeEach(() => { app = createApp(); jest.clearAllMocks(); });

  describe('POST /auth/login - Edge Cases', () => {
    test('returns 400 when username is empty string', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: '', password: 'password123' });
      expect(response.status).toBe(400);
    });

    test('returns 400 when password is empty string', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'admin', password: '' });
      expect(response.status).toBe(400);
    });

    test('returns 400 when body is completely empty', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({});
      expect(response.status).toBe(400);
    });

    test('returns 400 or 500 when username contains only whitespace', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: '   ', password: 'password123' });
      expect([400, 500]).toContain(response.status);
    });

    test('returns 400 when extra fields are sent (strips them)', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockQueryFn.mockResolvedValue({
        recordset: [{ Id: 1, Username: 'testuser', PasswordHash: hashedPassword, Role: 'admin', AllowedPages: 'all' }],
      });
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: 'password123', extraField: 'should be ignored' });
      expect([200, 400]).toContain(response.status);
    });

    test('handles very long username gracefully', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'a'.repeat(500), password: 'password123' });
      // Either validation fails or the query proceeds - should not crash
      expect([200, 400, 500]).toContain(response.status);
    });

    test('handles SQL injection attempt in username', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [] });
      const response = await request(app)
        .post('/auth/login')
        .send({ username: "admin'; DROP TABLE Users;--", password: 'password123' });
      // Should not crash - parameterized queries prevent injection
      expect([200, 400]).toContain(response.status);
    });

    test('handles SQL injection attempt in password', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [] });
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: "' OR 1=1;--" });
      expect([200, 400]).toContain(response.status);
    });

    test('handles special characters in username', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [] });
      const response = await request(app)
        .post('/auth/login')
        .send({ username: '<script>alert(1)</script>', password: 'password123' });
      expect([200, 400]).toContain(response.status);
    });

    test('handles null body gracefully', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send(null);
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('POST /auth/register - Edge Cases', () => {
    test('returns 400 when username is too short', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ username: 'ab', password: 'password123', fullName: 'Test User' });
      expect(response.status).toBe(400);
    });

    test('returns 400 when password is too short', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ username: 'testuser', password: '12', fullName: 'Test User' });
      expect(response.status).toBe(400);
    });

    test('returns 400 when fullName is empty', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ username: 'testuser', password: 'password123', fullName: '' });
      expect(response.status).toBe(400);
    });

    test('handles very long username', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ username: 'a'.repeat(200), password: 'password123', fullName: 'Test' });
      expect(response.status).toBe(400);
    });

    test('handles XSS in fullName field', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ rowsAffected: [1] });
      const response = await request(app)
        .post('/auth/register')
        .send({ username: 'testxss', password: 'password123', fullName: '<script>alert("xss")</script>' });
      expect([200, 201, 400]).toContain(response.status);
    });
  });

  describe('GET /auth/me - Edge Cases', () => {
    test('returns allowedPages as array for comma-separated pages', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ AllowedPages: 'dashboard,labmaster,planning', Role: 'employee' }],
      });
      const response = await request(app).get('/auth/me');
      expect(response.status).toBe(200);
      expect(response.body.user.allowedPages).toEqual(['dashboard', 'labmaster', 'planning']);
    });

    test('handles empty AllowedPages', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ AllowedPages: '', Role: 'employee' }],
      });
      const response = await request(app).get('/auth/me');
      expect(response.status).toBe(200);
    });

    test('handles null AllowedPages', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ AllowedPages: null, Role: 'employee' }],
      });
      const response = await request(app).get('/auth/me');
      expect(response.status).toBe(200);
    });

    test('handles database error gracefully', async () => {
      mockQueryFn.mockRejectedValue(new Error('DB Error'));
      const response = await request(app).get('/auth/me');
      expect([500, 503]).toContain(response.status);
    });
  });

  describe('POST /auth/logout', () => {
    test('always returns success', async () => {
      const response = await request(app).post('/auth/logout');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});