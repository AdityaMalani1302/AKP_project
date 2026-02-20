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
    Int: { type: 'Int' },
    Date: { type: 'Date' },
    Decimal: jest.fn((p, s) => ({ type: 'Decimal', precision: p, scale: s })),
  },
}));

const { sql } = require('../config/db');

// Import routes
const planningRoutes = require('../routes/planningRoutes');

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
  
  app.use('/planning', planningRoutes);
  return app;
};

describe('Planning Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /planning/raw-materials', () => {
    test('should return raw materials list', async () => {
      const mockMaterials = [
        { RawMatID: 1, RawMatName: 'Material A', RawMatCode: 'MAT-A' },
        { RawMatID: 2, RawMatName: 'Material B', RawMatCode: 'MAT-B' },
      ];

      mockQueryFn.mockResolvedValue({ recordset: mockMaterials });

      const response = await request(app).get('/planning/raw-materials');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/planning/raw-materials');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /planning/planning-master', () => {
    test('should return all planning schedules', async () => {
      const mockSchedules = [
        { ID: 1, ItemCode: 'ITEM-001', CustomerName: 'Customer A', ScheduleQty: 100 },
        { ID: 2, ItemCode: 'ITEM-002', CustomerName: 'Customer B', ScheduleQty: 200 },
      ];

      mockQueryFn.mockResolvedValue({ recordset: mockSchedules });

      const response = await request(app).get('/planning/planning-master');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should filter schedules by search query', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ ID: 1, ItemCode: 'ITEM-001' }],
      });

      const response = await request(app).get('/planning/planning-master?search=ITEM-001');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /planning/planning-master', () => {
    test('should create a new planning schedule', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ id: 1 }],
      });

      const newSchedule = {
        ItemCode: 'ITEM-NEW',
        CustomerName: 'New Customer',
        ScheduleQty: 150,
        PlanDate: '2024-12-27',
      };

      const response = await request(app)
        .post('/planning/planning-master')
        .send(newSchedule);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 400 when ItemCode is missing', async () => {
      const response = await request(app)
        .post('/planning/planning-master')
        .send({
          CustomerName: 'Customer',
          ScheduleQty: 100,
          PlanDate: '2024-12-27',
        });

      expect(response.status).toBe(400);
    });

    test('should return 400 when CustomerName is missing', async () => {
      const response = await request(app)
        .post('/planning/planning-master')
        .send({
          ItemCode: 'ITEM-001',
          ScheduleQty: 100,
          PlanDate: '2024-12-27',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /planning/planning-master/:id', () => {
    test('should update an existing schedule', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [1] });

      const updateData = {
        ItemCode: 'ITEM-UPDATED',
        CustomerName: 'Updated Customer',
        ScheduleQty: 200,
        PlanDate: '2024-12-28',
      };

      const response = await request(app)
        .put('/planning/planning-master/1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 404 for non-existent schedule', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [0] });

      const response = await request(app)
        .put('/planning/planning-master/999')
        .send({
          ItemCode: 'ITEM-001',
          CustomerName: 'Customer',
          ScheduleQty: 100,
          PlanDate: '2024-12-27',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /planning/planning-master/:id', () => {
    test('should delete a schedule', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [1] });

      const response = await request(app).delete('/planning/planning-master/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 404 for non-existent schedule', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [0] });

      const response = await request(app).delete('/planning/planning-master/999');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /planning/planning-entry', () => {
    test('should return all planning entries', async () => {
      const mockEntries = [
        { EntryId: 1, PatternNo: 'PAT-001', PartNo: 'PART-001' },
        { EntryId: 2, PatternNo: 'PAT-002', PartNo: 'PART-002' },
      ];

      mockQueryFn.mockResolvedValue({ recordset: mockEntries });

      const response = await request(app).get('/planning/planning-entry');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /planning/planning-entry', () => {
    test('should create planning entries in bulk', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [] });

      const entries = {
        entries: [
          {
            planDate: '2024-12-27',
            patternNo: 'PAT-001',
            partNo: 'PART-001',
            partQty: 10,
            shift: 1,
            mouldBoxSize: 'Large',
          },
        ],
      };

      const response = await request(app)
        .post('/planning/planning-entry')
        .send(entries);

      expect(response.status).toBe(200);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    test('should return 400 when entries array is empty', async () => {
      const response = await request(app)
        .post('/planning/planning-entry')
        .send({ entries: [] });

      expect(response.status).toBe(400);
    });

    test('should return 400 when entries is not provided', async () => {
      const response = await request(app)
        .post('/planning/planning-entry')
        .send({});

      expect(response.status).toBe(400);
    });

    test('should rollback transaction on error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Insert failed'));

      const entries = {
        entries: [
          { planDate: '2024-12-27', patternNo: 'PAT-001' },
        ],
      };

      const response = await request(app)
        .post('/planning/planning-entry')
        .send(entries);

      expect(response.status).toBe(500);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
