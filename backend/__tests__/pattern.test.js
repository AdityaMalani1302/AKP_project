const request = require('supertest');
const express = require('express');

// Create persistent mock functions
let mockQueryFn;
let mockTransaction;

// Mock the middleware
jest.mock('../middleware/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 1, username: 'testuser', role: 'admin' };
    next();
  },
  requirePage: (page) => (req, res, next) => {
    next();
  },
}));

// Mock the database config
jest.mock('../config/db', () => ({
  sql: {
    Request: jest.fn(),
    Transaction: jest.fn(),
    NVarChar: jest.fn((size) => ({ type: 'NVarChar', size })),
    VarChar: jest.fn((size) => ({ type: 'VarChar', size })),
    Numeric: jest.fn((p, s) => ({ type: 'Numeric', precision: p, scale: s })),
    Int: { type: 'Int' },
    Date: { type: 'Date' },
    Decimal: jest.fn((p, s) => ({ type: 'Decimal', precision: p, scale: s })),
  },
}));

const { sql } = require('../config/db');

// Import the routes
const patternRoutes = require('../routes/patternRoutes');

// Create test app with persistent mock
const createApp = () => {
  const app = express();
  app.use(express.json());
  
  mockQueryFn = jest.fn();
  mockTransaction = {
    begin: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
  };
  
  const mockRequest = {
    input: jest.fn().mockReturnThis(),
    query: mockQueryFn,
  };
  
  sql.Request.mockImplementation(() => mockRequest);
  sql.Transaction.mockImplementation(() => mockTransaction);
  
  app.use((req, res, next) => {
    req.db = {
      request: () => mockRequest,
    };
    next();
  });
  
  app.use('/pattern-master', patternRoutes);
  return app;
};

describe('Pattern Master Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /pattern-master/stats', () => {
    test('should return pattern statistics', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ TotalPatterns: 50, TotalParts: 120 }],
      });

      const response = await request(app).get('/pattern-master/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('TotalPatterns');
    });

    test('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/pattern-master/stats');

      expect(response.status).toBe(500);
    });
  });

  describe('POST /pattern-master', () => {
    test('should create a new pattern successfully', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ PatternId: 1 }],
      });

      const newPattern = {
        Customer: 1,
        Pattern_Maker: 'Test Maker',
        PatternNo: 'PAT-001',
        Product_Name: 'Test Product',
      };

      const response = await request(app)
        .post('/pattern-master')
        .send(newPattern);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockTransaction.begin).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    test('should return 400 when Customer is missing', async () => {
      const response = await request(app)
        .post('/pattern-master')
        .send({ Pattern_Maker: 'Test Maker' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    test('should return 400 when Pattern_Maker is missing', async () => {
      const response = await request(app)
        .post('/pattern-master')
        .send({ Customer: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    test('should create pattern with parts array', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ PatternId: 1 }],
      });

      const newPattern = {
        Customer: 1,
        Pattern_Maker: 'Test Maker',
        PatternNo: 'PAT-001',
        parts: [
          { partNo: 'PART-001', productName: 'Part 1', qty: 2, weight: 5.5 },
          { partNo: 'PART-002', productName: 'Part 2', qty: 1, weight: 3.2 },
        ],
      };

      const response = await request(app)
        .post('/pattern-master')
        .send(newPattern);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should rollback transaction on error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Insert failed'));

      const response = await request(app)
        .post('/pattern-master')
        .send({ Customer: 1, Pattern_Maker: 'Test' });

      expect(response.status).toBe(500);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('GET /pattern-master', () => {
    test('should return all patterns', async () => {
      const mockPatterns = [
        { PatternId: 1, PatternNo: 'PAT-001', CustomerName: 'Customer A' },
        { PatternId: 2, PatternNo: 'PAT-002', CustomerName: 'Customer B' },
      ];

      mockQueryFn.mockResolvedValue({ recordset: mockPatterns });

      const response = await request(app).get('/pattern-master');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should filter patterns by search query', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ PatternId: 1, PatternNo: 'PAT-001' }],
      });

      const response = await request(app).get('/pattern-master?search=PAT-001');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /pattern-master/:id', () => {
    test('should return a single pattern by ID', async () => {
      const mockPattern = { PatternId: 1, PatternNo: 'PAT-001' };

      mockQueryFn
        .mockResolvedValueOnce({ recordset: [mockPattern] })
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [] });

      const response = await request(app).get('/pattern-master/1');

      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent pattern', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [] });

      const response = await request(app).get('/pattern-master/999');

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /pattern-master/:id', () => {
    test('should delete a pattern and related data', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [1] });

      const response = await request(app).delete('/pattern-master/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 404 if pattern not found', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [0] });

      const response = await request(app).delete('/pattern-master/999');

      expect(response.status).toBe(404);
    });
  });
});
