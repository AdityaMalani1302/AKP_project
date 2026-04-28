const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    process.env.NODE_ENV = 'test';
  });

  describe('errorHandler', () => {
    test('handles generic Error with default 500 status', () => {
      const err = new Error('Something went wrong');
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Something went wrong',
      }));
    });

    test('uses custom statusCode from error', () => {
      const err = new Error('Not Found');
      err.statusCode = 404;
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('handles RequestError with 400 status', () => {
      const err = new Error('SQL syntax error');
      err.name = 'RequestError';
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Database request error',
      }));
    });

    test('handles JsonWebTokenError with 401 status', () => {
      const err = new Error('jwt malformed');
      err.name = 'JsonWebTokenError';
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid token',
      }));
    });

    test('handles TokenExpiredError with 401 status', () => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Token expired',
      }));
    });

    test('handles ZodError with 400 status and details', () => {
      const err = new Error('Validation error');
      err.name = 'ZodError';
      err.errors = [
        { path: ['username'], message: 'Required' },
        { path: ['password'], message: 'Too short' },
      ];
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Validation error',
        details: [
          { field: 'username', message: 'Required' },
          { field: 'password', message: 'Too short' },
        ],
      }));
    });

    test('falls back to 500 for unknown error types', () => {
      const err = new Error('Unknown error');
      errorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unknown error',
      }));
    });

    test('includes stack in non-production environments', () => {
      process.env.NODE_ENV = 'test';
      const err = new Error('debug error');
      err.stack = 'Error: debug error\n    at test.js:1:1';
      errorHandler(err, req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        stack: expect.any(String),
      }));
    });

    test('excludes stack in production environments', () => {
      process.env.NODE_ENV = 'production';
      const err = new Error('prod error');
      err.stack = 'Error: prod error\n    at test.js:1:1';
      errorHandler(err, req, res, next);
      const response = res.json.mock.calls[0][0];
      expect(response.stack).toBeUndefined();
      process.env.NODE_ENV = 'test';
    });

    test('defaults to "Internal Server Error" when error has no message', () => {
      const err = new Error();
      err.message = '';
      errorHandler(err, req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Internal Server Error',
      }));
    });
  });

  describe('notFoundHandler', () => {
    test('returns 404 with error message', () => {
      const req = { method: 'GET', originalUrl: '/api/unknown' };
      notFoundHandler(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Route not found' });
    });
  });
});