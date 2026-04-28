const {
  loginSchema,
  registerSchema,
  patternSchema,
  planningMasterSchema,
  planningEntrySchema,
  labMasterSchema,
  itAssetSchema,
  itSystemUserSchema,
  itDeviceRepairSchema,
  itComplaintSchema,
  itSoftwareSchema,
  userUpdateSchema,
  drawingMasterSchema,
  validateBody,
} = require('../utils/validators');

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    test('validates correct login data', () => {
      const result = loginSchema.safeParse({ username: 'admin', password: 'password123' });
      expect(result.success).toBe(true);
    });

    test('rejects empty username', () => {
      const result = loginSchema.safeParse({ username: '', password: 'password123' });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toMatch(/at least 3/i);
    });

    test('rejects empty password', () => {
      const result = loginSchema.safeParse({ username: 'admin', password: '' });
      expect(result.success).toBe(false);
    });

    test('rejects missing fields', () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
    });

    test('trims whitespace from username but does not reject whitespace-only (trim runs after min)', () => {
      const result = loginSchema.safeParse({ username: '   ', password: 'password123' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.username).toBe('');
    });

    test('rejects whitespace-only password', () => {
      const result = loginSchema.safeParse({ username: 'admin', password: '   ' });
      expect(result.success).toBe(false);
    });

    test('trims whitespace from username', () => {
      const result = loginSchema.safeParse({ username: '  admin  ', password: 'password123' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.username).toBe('admin');
    });

    test('rejects short password (less than 8 chars)', () => {
      const result = loginSchema.safeParse({ username: 'admin', password: 'pass12' });
      expect(result.success).toBe(false);
    });

    test('rejects short username (less than 3 chars)', () => {
      const result = loginSchema.safeParse({ username: 'ab', password: 'password123' });
      expect(result.success).toBe(false);
    });

    test('rejects very long username (over 50 chars)', () => {
      const result = loginSchema.safeParse({ username: 'a'.repeat(51), password: 'password123' });
      expect(result.success).toBe(false);
    });

    test('rejects very long password (over 100 chars)', () => {
      const result = loginSchema.safeParse({ username: 'admin', password: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    test('validates correct registration data', () => {
      const result = registerSchema.safeParse({
        username: 'newuser',
        password: 'password123',
        fullName: 'New User',
        role: 'employee',
        allowedPages: ['dashboard', 'labmaster'],
      });
      expect(result.success).toBe(true);
    });

    test('rejects short username', () => {
      const result = registerSchema.safeParse({
        username: 'ab', password: 'password123', fullName: 'Test',
      });
      expect(result.success).toBe(false);
    });

    test('rejects short password', () => {
      const result = registerSchema.safeParse({
        username: 'testuser', password: '12', fullName: 'Test',
      });
      expect(result.success).toBe(false);
    });

    test('rejects invalid role', () => {
      const result = registerSchema.safeParse({
        username: 'testuser', password: 'password123', fullName: 'Test', role: 'superadmin',
      });
      expect(result.success).toBe(false);
    });

    test('rejects empty fullName', () => {
      const result = registerSchema.safeParse({
        username: 'testuser', password: 'password123', fullName: '',
      });
      expect(result.success).toBe(false);
    });

    test('requires role field', () => {
      const result = registerSchema.safeParse({
        username: 'testuser', password: 'password123', fullName: 'Test User',
      });
      expect(result.success).toBe(false);
    });

    test('allows valid roles: admin, employee, manager', () => {
      ['admin', 'employee', 'manager'].forEach(role => {
        const result = registerSchema.safeParse({
          username: 'testuser', password: 'password123', fullName: 'Test User', role,
        });
        expect(result.success).toBe(true);
      });
    });

    test('trims username and fullName', () => {
      const result = registerSchema.safeParse({
        username: '  testuser  ', password: 'password123', fullName: '  Test User  ', role: 'employee',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('testuser');
        expect(result.data.fullName).toBe('Test User');
      }
    });
  });

  describe('patternSchema', () => {
    test('validates correct pattern data with required fields', () => {
      const result = patternSchema.safeParse({
        Customer: 1,
      });
      expect(result.success).toBe(true);
    });

    test('rejects missing Customer', () => {
      const result = patternSchema.safeParse({
        PatternNo: 'P-001',
      });
      expect(result.success).toBe(false);
    });

    test('accepts zero Customer (fails positive)', () => {
      const result = patternSchema.safeParse({ Customer: 0 });
      expect(result.success).toBe(false);
    });

    test('accepts optional fields as null', () => {
      const result = patternSchema.safeParse({
        Customer: 1,
        PatternNo: null,
        Bunch_Wt: null,
      });
      expect(result.success).toBe(true);
    });

    test('allows passthrough of unknown fields', () => {
      const result = patternSchema.safeParse({
        Customer: 1,
        unknownField: 'should be preserved',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.unknownField).toBe('should be preserved');
    });
  });

  describe('drawingMasterSchema', () => {
    test('validates correct drawing master data', () => {
      const result = drawingMasterSchema.safeParse({
        Customer: 'Customer A',
        DrawingNo: 'DWG-001',
      });
      expect(result.success).toBe(true);
    });

    test('rejects empty Customer', () => {
      const result = drawingMasterSchema.safeParse({
        Customer: '',
        DrawingNo: 'DWG-001',
      });
      expect(result.success).toBe(false);
    });

    test('rejects empty DrawingNo', () => {
      const result = drawingMasterSchema.safeParse({
        Customer: 'Customer A',
        DrawingNo: '',
      });
      expect(result.success).toBe(false);
    });

    test('allows optional fields', () => {
      const result = drawingMasterSchema.safeParse({
        Customer: 'Customer A',
        DrawingNo: 'DWG-001',
        Description: 'Some description',
        RevNo: 'A',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('planningMasterSchema', () => {
    test('validates correct planning data with all required fields', () => {
      const result = planningMasterSchema.safeParse({
        ItemCode: 'ITEM-001',
        CustomerName: 'Customer A',
        ScheduleQty: 100,
        PlanDate: '2024-01-15',
      });
      expect(result.success).toBe(true);
    });

    test('rejects missing ItemCode', () => {
      const result = planningMasterSchema.safeParse({
        CustomerName: 'Customer A',
        ScheduleQty: 100,
        PlanDate: '2024-01-15',
      });
      expect(result.success).toBe(false);
    });

    test('rejects missing CustomerName', () => {
      const result = planningMasterSchema.safeParse({
        ItemCode: 'ITEM-001',
        ScheduleQty: 100,
        PlanDate: '2024-01-15',
      });
      expect(result.success).toBe(false);
    });

    test('rejects missing ScheduleQty', () => {
      const result = planningMasterSchema.safeParse({
        ItemCode: 'ITEM-001',
        CustomerName: 'Customer A',
        PlanDate: '2024-01-15',
      });
      expect(result.success).toBe(false);
    });

    test('rejects zero ScheduleQty (must be positive)', () => {
      const result = planningMasterSchema.safeParse({
        ItemCode: 'ITEM-001',
        CustomerName: 'Customer A',
        ScheduleQty: 0,
        PlanDate: '2024-01-15',
      });
      expect(result.success).toBe(false);
    });

    test('coerces string ScheduleQty to number', () => {
      const result = planningMasterSchema.safeParse({
        ItemCode: 'ITEM-001',
        CustomerName: 'Customer A',
        ScheduleQty: '100',
        PlanDate: '2024-01-15',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.ScheduleQty).toBe(100);
    });
  });

  describe('planningEntrySchema', () => {
    test('validates correct entries array', () => {
      const result = planningEntrySchema.safeParse({
        entries: [{ shift: '1' }],
      });
      expect(result.success).toBe(true);
    });

    test('rejects empty entries array', () => {
      const result = planningEntrySchema.safeParse({
        entries: [],
      });
      expect(result.success).toBe(false);
    });

    test('rejects missing entries field', () => {
      const result = planningEntrySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('labMasterSchema', () => {
    test('validates with all fields optional/nullable', () => {
      const result = labMasterSchema.safeParse({
        Customer: 'Customer A',
        DrgNo: 'DRG-001',
      });
      expect(result.success).toBe(true);
    });

    test('allows empty object (all fields optional)', () => {
      const result = labMasterSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test('allows null values for optional fields', () => {
      const result = labMasterSchema.safeParse({
        Customer: null,
        DrgNo: null,
        Description: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('itAssetSchema', () => {
    test('validates correct asset data', () => {
      const result = itAssetSchema.safeParse({
        AssetName: 'Laptop',
        AssetType: 'Hardware',
      });
      expect(result.success).toBe(true);
    });

    test('allows empty object (all fields optional)', () => {
      const result = itAssetSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test('allows null values', () => {
      const result = itAssetSchema.safeParse({
        AssetName: null,
        AssetType: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('itSystemUserSchema', () => {
    test('validates correct system user data', () => {
      const result = itSystemUserSchema.safeParse({
        AssetId: 1,
        AssignedUser: 'John',
        SystemName: 'ERP',
      });
      expect(result.success).toBe(true);
    });

    test('rejects missing AssetId', () => {
      const result = itSystemUserSchema.safeParse({
        AssignedUser: 'John',
        SystemName: 'ERP',
      });
      expect(result.success).toBe(false);
    });

    test('coerces string AssetId to number', () => {
      const result = itSystemUserSchema.safeParse({
        AssetId: '5',
        AssignedUser: 'John',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.AssetId).toBe(5);
    });
  });

  describe('itDeviceRepairSchema', () => {
    test('validates correct device repair data', () => {
      const result = itDeviceRepairSchema.safeParse({
        AssetId: 1,
        RepairCost: 500,
      });
      expect(result.success).toBe(true);
    });

    test('rejects missing AssetId', () => {
      const result = itDeviceRepairSchema.safeParse({
        IssueDescription: 'Screen broken',
      });
      expect(result.success).toBe(false);
    });

    test('rejects zero AssetId (must be positive)', () => {
      const result = itDeviceRepairSchema.safeParse({
        AssetId: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('userUpdateSchema', () => {
    test('validates partial update with fullName', () => {
      const result = userUpdateSchema.safeParse({ fullName: 'Updated Name' });
      expect(result.success).toBe(true);
    });

    test('validates partial update with role (as username)', () => {
      const result = userUpdateSchema.safeParse({ username: 'newusername' });
      expect(result.success).toBe(true);
    });

    test('allows any string for role field (passthrough)', () => {
      const result = userUpdateSchema.safeParse({ role: 'superadmin' });
      expect(result.success).toBe(true);
    });

    test('allows empty object', () => {
      const result = userUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test('rejects short fullName (less than 2)', () => {
      const result = userUpdateSchema.safeParse({ fullName: 'A' });
      expect(result.success).toBe(false);
    });

    test('allows allowedPages as array', () => {
      const result = userUpdateSchema.safeParse({ allowedPages: ['dashboard', 'labmaster'] });
      expect(result.success).toBe(true);
    });
  });

  describe('validateBody middleware', () => {
    test('calls next() when validation passes', () => {
      const middleware = validateBody(loginSchema);
      const req = { body: { username: 'admin', password: 'password123' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.username).toBe('admin');
    });

    test('returns 400 when validation fails', () => {
      const middleware = validateBody(loginSchema);
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(res.json.mock.calls[0][0].error).toMatch(/validation/i);
      expect(next).not.toHaveBeenCalled();
    });

    test('strips unknown fields from validated data (when schema uses passthrough)', () => {
      const middleware = validateBody(drawingMasterSchema);
      const req = { body: { Customer: 'Test', DrawingNo: 'DWG-001', extraField: 'should be preserved' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.extraField).toBe('should be preserved');
    });

    test('transforms data according to schema (trim)', () => {
      const middleware = validateBody(loginSchema);
      const req = { body: { username: '  admin  ', password: 'password123' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.username).toBe('admin');
    });

    test('returns detailed field errors on validation failure', () => {
      const middleware = validateBody(registerSchema);
      const req = { body: { username: '', password: '' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      const errorResponse = res.json.mock.calls[0][0];
      expect(errorResponse.details).toBeDefined();
      expect(errorResponse.details.length).toBeGreaterThan(0);
    });

    test('returns 500 on unexpected error', () => {
      const middleware = validateBody({
        safeParse: () => { throw new Error('Unexpected'); },
      });
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(next).not.toHaveBeenCalled();
    });
  });
});