const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

// Create a persistent mock query function
let mockQueryFn;

// Mock the middleware
jest.mock('../middleware/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 1, username: 'testuser', role: 'admin' };
    next();
  },
  requireRole: (role) => (req, res, next) => {
    if (req.user.role === role || req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  },
}));

// Mock the validators
jest.mock('../utils/validators', () => ({
  loginSchema: {},
  registerSchema: {},
  validateBody: () => (req, res, next) => next(),
}));

// Import the routes after mocking
const authRoutes = require('../routes/authRoutes');

// Create test app with persistent mock
const createApp = () => {
  const app = express();
  app.use(express.json());
  
  // Create mock with persistent query function
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

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    test('should return success with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      mockQueryFn.mockResolvedValue({
        recordset: [{
          Id: 1,
          Username: 'testuser',
          PasswordHash: hashedPassword,
          Role: 'admin',
          AllowedPages: 'all',
        }],
      });

      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.username).toBe('testuser');
      expect(response.body.role).toBe('admin');
    });

    test('should return 400 for invalid username', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [] });

      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'nonexistent', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should return 400 for incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      
      mockQueryFn.mockResolvedValue({
        recordset: [{
          Id: 1,
          Username: 'testuser',
          PasswordHash: hashedPassword,
          Role: 'admin',
          AllowedPages: 'all',
        }],
      });

      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should set httpOnly cookie on successful login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      mockQueryFn.mockResolvedValue({
        recordset: [{
          Id: 1,
          Username: 'testuser',
          PasswordHash: hashedPassword,
          Role: 'employee',
          AllowedPages: 'dashboard,labmaster',
        }],
      });

      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('should return allowedPages array for employee', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      mockQueryFn.mockResolvedValue({
        recordset: [{
          Id: 1,
          Username: 'employee1',
          PasswordHash: hashedPassword,
          Role: 'employee',
          AllowedPages: 'dashboard,labmaster,patternmaster',
        }],
      });

      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'employee1', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.allowedPages).toEqual(['dashboard', 'labmaster', 'patternmaster']);
    });

    test('should handle database errors gracefully', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: 'password123' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Login failed');
    });
  });

  describe('POST /auth/logout', () => {
    test('should clear cookie and return success', async () => {
      const response = await request(app).post('/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('GET /auth/me', () => {
    test('should return user info for authenticated user', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{
          AllowedPages: 'dashboard,labmaster',
          Role: 'employee',
        }],
      });

      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
    });

    test('should return all pages for admin user', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{
          AllowedPages: 'all',
          Role: 'admin',
        }],
      });

      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.user.allowedPages).toEqual(['all']);
    });
  });

  describe('POST /auth/register', () => {
    test('should register new user successfully', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [] });

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'newuser',
          password: 'password123',
          fullName: 'New User',
          role: 'employee',
          allowedPages: ['dashboard', 'labmaster'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ username: 'newuser' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    test('should return 400 for duplicate username', async () => {
      const duplicateError = new Error('Duplicate entry');
      duplicateError.number = 2627;
      mockQueryFn.mockRejectedValue(duplicateError);

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'existinguser',
          password: 'password123',
          fullName: 'Existing User',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username already exists');
    });
  });
});
