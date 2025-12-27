const request = require('supertest');
const express = require('express');

// Create persistent mock functions
let mockQueryFn;

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
    NVarChar: jest.fn((size) => ({ type: 'NVarChar', size })),
    Int: { type: 'Int' },
  },
}));

const { sql } = require('../config/db');

// Import the routes
const labRoutes = require('../routes/labRoutes');

// Create test app with persistent mock
const createApp = () => {
  const app = express();
  app.use(express.json());
  
  mockQueryFn = jest.fn();
  
  const mockRequest = {
    input: jest.fn().mockReturnThis(),
    query: mockQueryFn,
  };
  
  sql.Request.mockImplementation(() => mockRequest);
  
  app.use((req, res, next) => {
    req.db = {
      request: () => mockRequest,
    };
    next();
  });
  
  app.use('/lab-master', labRoutes);
  return app;
};

describe('Lab Master Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /lab-master', () => {
    test('should return all lab master records', async () => {
      const mockRecords = [
        { LabMasterId: 1, Customer: 'Customer A', DrgNo: 'DRG-001' },
        { LabMasterId: 2, Customer: 'Customer B', DrgNo: 'DRG-002' },
      ];

      mockQueryFn.mockResolvedValue({ recordset: mockRecords });

      const response = await request(app).get('/lab-master');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecords);
    });

    test('should filter records by search query', async () => {
      const mockRecords = [
        { LabMasterId: 1, Customer: 'Customer A', DrgNo: 'DRG-001' },
      ];

      mockQueryFn.mockResolvedValue({ recordset: mockRecords });

      const response = await request(app).get('/lab-master?search=DRG-001');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecords);
    });

    test('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/lab-master');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch lab master records');
    });
  });

  describe('GET /lab-master/:id', () => {
    test('should return a single record by ID', async () => {
      const mockRecord = { LabMasterId: 1, Customer: 'Customer A', DrgNo: 'DRG-001' };

      mockQueryFn.mockResolvedValue({ recordset: [mockRecord] });

      const response = await request(app).get('/lab-master/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecord);
    });

    test('should return 404 for non-existent record', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [] });

      const response = await request(app).get('/lab-master/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lab master record not found');
    });
  });

  describe('POST /lab-master', () => {
    test('should create a new record', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [{ LabMasterId: 3 }] });

      const newRecord = {
        Customer: 'New Customer',
        DrgNo: 'DRG-NEW',
        Description: 'New Part',
        Grade: 'Grade A',
      };

      const response = await request(app)
        .post('/lab-master')
        .send(newRecord);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.id).toBe(3);
    });

    test('should return duplicate warning if DrgNo already exists', async () => {
      mockQueryFn.mockResolvedValueOnce({ 
        recordset: [{ LabMasterId: 1, DrgNo: 'DRG-001' }] 
      });

      const response = await request(app)
        .post('/lab-master')
        .send({ Customer: 'Test', DrgNo: 'DRG-001' });

      expect(response.status).toBe(200);
      expect(response.body.warning).toBeDefined();
    });

    test('should handle database errors on create', async () => {
      mockQueryFn.mockRejectedValue(new Error('Insert failed'));

      const response = await request(app)
        .post('/lab-master')
        .send({ Customer: 'Test', DrgNo: 'DRG-NEW' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to add lab master record');
    });
  });

  describe('PUT /lab-master/:id', () => {
    test('should update an existing record', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [1] });

      const updateData = {
        Customer: 'Updated Customer',
        DrgNo: 'DRG-001',
        Description: 'Updated Description',
      };

      const response = await request(app)
        .put('/lab-master/1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 404 if record to update not found', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [0] });

      const response = await request(app)
        .put('/lab-master/999')
        .send({ Customer: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lab master record not found');
    });

    test('should handle database errors on update', async () => {
      mockQueryFn.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .put('/lab-master/1')
        .send({ Customer: 'Test' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update lab master record');
    });
  });

  describe('DELETE /lab-master/:id', () => {
    test('should delete an existing record', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [1] });

      const response = await request(app).delete('/lab-master/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 404 if record to delete not found', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [0] });

      const response = await request(app).delete('/lab-master/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lab master record not found');
    });

    test('should handle database errors on delete', async () => {
      mockQueryFn.mockRejectedValue(new Error('Delete failed'));

      const response = await request(app).delete('/lab-master/1');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete lab master record');
    });
  });
});
