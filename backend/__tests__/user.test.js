const request = require('supertest');
const express = require('express');

let mockQueryFn;

// Mock the middleware
jest.mock('../middleware/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 1, username: 'admin', role: 'admin' };
    next();
  },
  requireRole: (role) => (req, res, next) => {
    next();
  },
}));

// Mock cache to clear between tests
jest.mock('../utils/cache', () => {
  const actualCache = jest.requireActual('../utils/cache');
  return {
    ...actualCache,
    cacheMiddleware: (prefix, ttl) => (req, res, next) => {
      // Skip caching in tests
      next();
    }
  };
});

// Import routes
const userRoutes = require('../routes/userRoutes');

// Create test app
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
  
  app.use('/users', userRoutes);
  return app;
};

describe('User Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /users', () => {
    test('should return all users', async () => {
      const mockUsers = [
        { Id: 1, Username: 'admin', FullName: 'Admin User', Role: 'admin' },
        { Id: 2, Username: 'user1', FullName: 'User One', Role: 'employee' },
      ];

      mockQueryFn.mockResolvedValue({ recordset: mockUsers });

      const response = await request(app).get('/users');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
    });

    test('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/users');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch users');
    });
  });

  describe('PUT /users/:id', () => {
    test('should update user successfully', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [1] });

      const response = await request(app)
        .put('/users/1')
        .send({ username: 'updated_user', fullName: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 400 when no fields to update', async () => {
      const response = await request(app)
        .put('/users/1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });

    test('should return 404 when user not found', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [0] });

      const response = await request(app)
        .put('/users/999')
        .send({ username: 'test' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    test('should return 400 for duplicate username', async () => {
      const error = new Error('Duplicate');
      error.number = 2627;
      mockQueryFn.mockRejectedValue(error);

      const response = await request(app)
        .put('/users/1')
        .send({ username: 'existing_user' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username already exists');
    });

    test('should update allowedPages', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [1] });

      const response = await request(app)
        .put('/users/1')
        .send({ allowedPages: ['dashboard', 'labmaster'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /users/:id', () => {
    test('should delete user successfully', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ recordset: [{ Id: 2, Role: 'employee' }] })
        .mockResolvedValueOnce({ rowsAffected: [1] });

      const response = await request(app).delete('/users/2');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 404 when user not found', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [] });

      const response = await request(app).delete('/users/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    test('should return 403 when trying to delete admin', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [{ Id: 1, Role: 'admin' }] });

      const response = await request(app).delete('/users/1');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Cannot delete admin users');
    });

    test('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/users/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete user');
    });
  });
});
