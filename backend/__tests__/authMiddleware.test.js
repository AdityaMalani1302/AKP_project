const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const { verifyToken, requireRole, requirePage } = require('../middleware/authMiddleware');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      cookies: {},
      headers: {},
      db: {
        request: jest.fn().mockReturnThis(),
        input: jest.fn().mockReturnThis(),
        query: jest.fn(),
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('verifyToken', () => {
    test('returns 401 when no token provided', async () => {
      await verifyToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('No token') }));
      expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token is in cookies but invalid', async () => {
      req.cookies.token = 'invalid-token';
      await verifyToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Invalid') }));
      expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token is in Authorization header but invalid', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      await verifyToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('extracts token from cookies', async () => {
      const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET);
      req.cookies.token = token;
      req.db.request = jest.fn().mockReturnValue({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({
          recordset: [{ Role: 'admin', AllowedPages: 'all', IsActive: true }],
        }),
      });

      await verifyToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.username).toBe('testuser');
      expect(req.user.role).toBe('admin');
    });

    test('extracts token from Authorization header', async () => {
      const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;
      req.db.request = jest.fn().mockReturnValue({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({
          recordset: [{ Role: 'employee', AllowedPages: 'dashboard,labmaster', IsActive: true }],
        }),
      });

      await verifyToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.role).toBe('employee');
      expect(req.user.allowedPages).toEqual(['dashboard', 'labmaster']);
    });

    test('prefers cookie token over Authorization header', async () => {
      const cookieToken = jwt.sign({ id: 1, username: 'cookieuser' }, JWT_SECRET);
      req.cookies.token = cookieToken;
      req.headers.authorization = 'Bearer some-other-token';
      req.db.request = jest.fn().mockReturnValue({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({
          recordset: [{ Role: 'admin', AllowedPages: 'all', IsActive: true }],
        }),
      });

      await verifyToken(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user.username).toBe('cookieuser');
    });

    test('returns 401 when user not found in database', async () => {
      const token = jwt.sign({ id: 999, username: 'ghost' }, JWT_SECRET);
      req.cookies.token = token;
      req.db.request = jest.fn().mockReturnValue({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({ recordset: [] }),
      });

      await verifyToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('not found') }));
      expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when user is inactive', async () => {
      const token = jwt.sign({ id: 2, username: 'inactiveuser' }, JWT_SECRET);
      req.cookies.token = token;
      req.db.request = jest.fn().mockReturnValue({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({
          recordset: [{ Role: 'employee', AllowedPages: 'dashboard', IsActive: false }],
        }),
      });

      await verifyToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('inactive') }));
      expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when database connection is not available', async () => {
      const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET);
      req.cookies.token = token;
      delete req.db;

      await verifyToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('sets allowedPages to ["all"] for admin users', async () => {
      const token = jwt.sign({ id: 1, username: 'admin' }, JWT_SECRET);
      req.cookies.token = token;
      req.db.request = jest.fn().mockReturnValue({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({
          recordset: [{ Role: 'admin', AllowedPages: 'all', IsActive: true }],
        }),
      });

      await verifyToken(req, res, next);
      expect(req.user.allowedPages).toEqual(['all']);
    });

    test('splits AllowedPages string into array for employees', async () => {
      const token = jwt.sign({ id: 2, username: 'emp' }, JWT_SECRET);
      req.cookies.token = token;
      req.db.request = jest.fn().mockReturnValue({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({
          recordset: [{ Role: 'employee', AllowedPages: 'dashboard,labmaster,planning', IsActive: true }],
        }),
      });

      await verifyToken(req, res, next);
      expect(req.user.allowedPages).toEqual(['dashboard', 'labmaster', 'planning']);
    });

    test('handles empty AllowedPages gracefully', async () => {
      const token = jwt.sign({ id: 3, username: 'emp2' }, JWT_SECRET);
      req.cookies.token = token;
      req.db.request = jest.fn().mockReturnValue({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({
          recordset: [{ Role: 'employee', AllowedPages: null, IsActive: true }],
        }),
      });

      await verifyToken(req, res, next);
      expect(req.user.allowedPages).toEqual([]);
    });

    test('returns 401 when expired token is used', async () => {
      const token = jwt.sign({ id: 1, username: 'testuser' }, JWT_SECRET, { expiresIn: '-1s' });
      req.cookies.token = token;
      await verifyToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    test('calls next() when user has the required role', () => {
      req.user = { id: 1, username: 'admin', role: 'admin' };
      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns 403 when user does not have the required role', () => {
      req.user = { id: 2, username: 'employee', role: 'employee' };
      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('denied') }));
      expect(next).not.toHaveBeenCalled();
    });

    test('returns 403 when req.user is undefined', () => {
      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requirePage', () => {
    test('calls next() when user has access to the page', () => {
      req.user = { id: 2, username: 'emp', role: 'employee', allowedPages: ['dashboard', 'labmaster'] };
      const middleware = requirePage('labmaster');
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('calls next() when user is admin', () => {
      req.user = { id: 1, username: 'admin', role: 'admin', allowedPages: ['all'] };
      const middleware = requirePage('labmaster');
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('calls next() when user has "all" page access', () => {
      req.user = { id: 2, username: 'emp', role: 'employee', allowedPages: ['all'] };
      const middleware = requirePage('labmaster');
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('returns 403 when user does not have page access', () => {
      req.user = { id: 2, username: 'emp', role: 'employee', allowedPages: ['dashboard'] };
      const middleware = requirePage('labmaster');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when req.user is undefined', () => {
      const middleware = requirePage('labmaster');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('returns 403 when allowedPages is empty', () => {
      req.user = { id: 2, username: 'emp', role: 'employee', allowedPages: [] };
      const middleware = requirePage('labmaster');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});