const request = require('supertest');
const express = require('express');

let mockQueryFn;

// Mock the middleware
jest.mock('../middleware/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = { id: 1, username: 'admin', role: 'admin' };
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
    Date: { type: 'Date' },
    DateTime2: { type: 'DateTime2' },
  },
}));

const { sql } = require('../config/db');

// Import routes
const itRoutes = require('../routes/itManagementRoutes');

// Create test app
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
  
  app.use('/it-management', itRoutes);
  return app;
};

describe('IT Management Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /it-management/stats', () => {
    test('should return IT stats', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ TotalAssets: 50, TotalComplaints: 10 }],
      });

      const response = await request(app).get('/it-management/stats');

      expect(response.status).toBe(200);
    });
  });

  describe('Assets CRUD', () => {
    test('GET /assets should return all assets', async () => {
      const mockAssets = [
        { AssetId: 1, AssetTagNumber: 'AST001', AssetName: 'Laptop' },
        { AssetId: 2, AssetTagNumber: 'AST002', AssetName: 'Desktop' },
      ];

      mockQueryFn.mockResolvedValue({ recordset: mockAssets });

      const response = await request(app).get('/it-management/assets');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('GET /assets/:id should return single asset', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ AssetId: 1, AssetTagNumber: 'AST001' }],
      });

      const response = await request(app).get('/it-management/assets/1');

      expect(response.status).toBe(200);
    });

    test('GET /assets/:id should return 404 for non-existent', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [] });

      const response = await request(app).get('/it-management/assets/999');

      expect(response.status).toBe(404);
    });

    test('POST /assets should create new asset', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({ recordset: [{ AssetId: 1 }] });

      const response = await request(app)
        .post('/it-management/assets')
        .send({ AssetTagNumber: 'AST001', AssetName: 'New Laptop' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('PUT /assets/:id should update asset', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [1] });

      const response = await request(app)
        .put('/it-management/assets/1')
        .send({ AssetName: 'Updated Laptop' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('DELETE /assets/:id should delete asset', async () => {
      mockQueryFn.mockResolvedValue({ rowsAffected: [1] });

      const response = await request(app).delete('/it-management/assets/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('System Users CRUD', () => {
    test('GET /system-users should return all system users', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ SystemUserId: 1, Username: 'user1' }],
      });

      const response = await request(app).get('/it-management/system-users');

      expect(response.status).toBe(200);
    });

    test('POST /system-users should create new user', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [{ SystemUserId: 1 }] });

      const response = await request(app)
        .post('/it-management/system-users')
        .send({ Username: 'newuser', FullName: 'New User' });

      expect(response.status).toBe(200);
    });
  });

  describe('Software CRUD', () => {
    test('GET /software should return all software', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ SoftwareId: 1, SoftwareName: 'Office' }],
      });

      const response = await request(app).get('/it-management/software');

      expect(response.status).toBe(200);
    });

    test('POST /software should create new software', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [{ SoftwareId: 1 }] });

      const response = await request(app)
        .post('/it-management/software')
        .send({ SoftwareName: 'New Software' });

      expect(response.status).toBe(200);
    });
  });

  describe('Complaints CRUD', () => {
    test('GET /complaints should return all complaints', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ ComplaintId: 1, Description: 'Issue' }],
      });

      const response = await request(app).get('/it-management/complaints');

      expect(response.status).toBe(200);
    });

    test('POST /complaints should create new complaint', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [{ ComplaintId: 1 }] });

      const response = await request(app)
        .post('/it-management/complaints')
        .send({ Description: 'New Issue' });

      expect(response.status).toBe(200);
    });
  });

  describe('Device Repairs CRUD', () => {
    test('GET /device-repairs should return all repairs', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ RepairId: 1, Issue: 'Broken screen' }],
      });

      const response = await request(app).get('/it-management/device-repairs');

      expect(response.status).toBe(200);
    });

    test('POST /device-repairs should create new repair', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [{ RepairId: 1 }] });

      const response = await request(app)
        .post('/it-management/device-repairs')
        .send({ Issue: 'New repair' });

      expect(response.status).toBe(200);
    });
  });

  describe('Resolved Tickets CRUD', () => {
    test('GET /resolved should return all resolved tickets', async () => {
      mockQueryFn.mockResolvedValue({
        recordset: [{ ResolvedId: 1, Resolution: 'Fixed' }],
      });

      const response = await request(app).get('/it-management/resolved');

      expect(response.status).toBe(200);
    });

    test('POST /resolved should create new resolved ticket', async () => {
      mockQueryFn.mockResolvedValue({ recordset: [{ ResolvedId: 1 }] });

      const response = await request(app)
        .post('/it-management/resolved')
        .send({ Resolution: 'New resolution' });

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    test('should return 500 on database error for assets', async () => {
      mockQueryFn.mockRejectedValue(new Error('DB Error'));

      const response = await request(app).get('/it-management/assets');

      expect(response.status).toBe(500);
    });

    test('should return 500 on database error for complaints', async () => {
      mockQueryFn.mockRejectedValue(new Error('DB Error'));

      const response = await request(app).get('/it-management/complaints');

      expect(response.status).toBe(500);
    });
  });
});
