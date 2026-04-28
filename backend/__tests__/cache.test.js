const NodeCache = require('node-cache');

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Cache Middleware', () => {
  let req, res, next;
  let cacheMiddleware, invalidateCache;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    req = {
      originalUrl: '/api/test-endpoint',
      method: 'GET',
    };
    next = jest.fn();
    // Re-require to get fresh cache instance per test
    const cacheModule = require('../utils/cache');
    cacheMiddleware = cacheModule.cacheMiddleware;
    invalidateCache = cacheModule.invalidateCache;
  });

  describe('cacheMiddleware', () => {
    test('calls next() when no cached data exists', () => {
      const middleware = cacheMiddleware('test-prefix-' + Date.now());
      res = { set: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), statusCode: 200 };
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('wraps res.json to intercept responses', () => {
      const middleware = cacheMiddleware('test-prefix-' + Date.now());
      const originalJson = jest.fn().mockReturnThis();
      res = { set: jest.fn().mockReturnThis(), json: originalJson, statusCode: 200 };
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(typeof res.json).toBe('function');
    });

    test('sets X-Cache: MISS on first request', () => {
      const middleware = cacheMiddleware('test-prefix-' + Date.now());
      const originalJson = jest.fn().mockReturnThis();
      res = { set: jest.fn().mockReturnThis(), json: originalJson, statusCode: 200 };
      middleware(req, res, next);
      res.json({ data: 'test' });
      expect(res.set).toHaveBeenCalledWith('X-Cache', 'MISS');
    });

    test('delegates to original res.json after wrapping', () => {
      const middleware = cacheMiddleware('test-prefix-' + Date.now());
      const originalJson = jest.fn().mockReturnThis();
      res = { set: jest.fn().mockReturnThis(), json: originalJson, statusCode: 200 };
      middleware(req, res, next);
      const responseData = { items: [1, 2, 3] };
      res.json(responseData);
      expect(originalJson).toHaveBeenCalledWith(responseData);
    });

    test('returns cached data and sets X-Cache: HIT on second request', () => {
      const prefix = 'test-prefix-' + Date.now();
      const middleware = cacheMiddleware(prefix);
      const originalJson = jest.fn().mockReturnThis();
      res = { set: jest.fn().mockReturnThis(), json: originalJson, statusCode: 200 };
      middleware(req, res, next);
      const cachedData = { items: [1, 2, 3] };
      res.json(cachedData);

      // Second request - should get cached data
      const res2 = { set: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), statusCode: 200 };
      const next2 = jest.fn();
      middleware(req, res2, next2);
      expect(res2.set).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res2.json).toHaveBeenCalledWith(cachedData);
      expect(next2).not.toHaveBeenCalled();
    });

    test('does not cache non-2xx responses', () => {
      const prefix = 'test-prefix-' + Date.now();
      const middleware = cacheMiddleware(prefix);
      const originalJson = jest.fn().mockReturnThis();
      res = { set: jest.fn().mockReturnThis(), json: originalJson, statusCode: 500 };
      middleware(req, res, next);
      res.json({ error: 'Server error' });

      // Second request - should NOT get cached data (still MISS)
      const res2 = { set: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), statusCode: 200 };
      const next2 = jest.fn();
      middleware(req, res2, next2);
      expect(next2).toHaveBeenCalled();
    });

    test('uses custom TTL when provided', () => {
      const middleware = cacheMiddleware('test-prefix-' + Date.now(), 60);
      res = { set: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), statusCode: 200 };
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('uses default TTL when not provided', () => {
      const middleware = cacheMiddleware('test-prefix-' + Date.now());
      res = { set: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), statusCode: 200 };
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('builds different cache keys for different URLs', () => {
      const prefix = 'test-prefix-' + Date.now();
      const middleware = cacheMiddleware(prefix);
      const originalJson = jest.fn().mockReturnThis();

      // First URL
      req.originalUrl = '/api/test-endpoint-1';
      res = { set: jest.fn().mockReturnThis(), json: originalJson, statusCode: 200 };
      middleware(req, res, next);
      res.json({ id: 1 });

      // Different URL - should be cache miss
      const res2 = { set: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), statusCode: 200 };
      const next2 = jest.fn();
      const req2 = { originalUrl: '/api/test-endpoint-2', method: 'GET' };
      middleware(req2, res2, next2);
      expect(next2).toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    test('invalidates cache entries matching prefix', () => {
      const prefix = 'test-prefix-unique-' + Date.now();
      const middleware = cacheMiddleware(prefix);
      const originalJson = jest.fn().mockReturnThis();
      res = { set: jest.fn().mockReturnThis(), json: originalJson, statusCode: 200 };
      middleware(req, res, next);
      res.json({ data: 'cached' });

      invalidateCache(prefix);

      // After invalidation, call middleware again - should call next (cache miss)
      const next2 = jest.fn();
      const res2 = { set: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), statusCode: 200 };
      middleware(req, res2, next2);
      expect(next2).toHaveBeenCalled();
    });

    test('handles invalidation with no matching keys', () => {
      expect(() => invalidateCache('nonexistent-prefix')).not.toThrow();
    });
  });
});