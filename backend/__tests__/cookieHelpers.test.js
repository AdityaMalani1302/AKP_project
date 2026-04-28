const { getCookieOptions } = require('../utils/cookieHelpers');

describe('cookieHelpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getCookieOptions', () => {
    test('returns httpOnly: true always', () => {
      const req = {
        get: jest.fn(() => ''),
        secure: false,
        protocol: 'http',
      };
      const options = getCookieOptions(req);
      expect(options.httpOnly).toBe(true);
    });

    test('sets secure: true and sameSite: none for cloud deployment (vercel)', () => {
      process.env.FRONTEND_URL = 'https://myapp.vercel.app';
      const req = {
        get: jest.fn(() => 'https://myapp.vercel.app'),
        secure: false,
        protocol: 'http',
      };
      const options = getCookieOptions(req);
      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe('none');
    });

    test('sets secure: true and sameSite: none for cloudflare tunnel', () => {
      process.env.FRONTEND_URL = 'https://abc.trycloudflare.com';
      const req = {
        get: jest.fn(() => 'https://abc.trycloudflare.com'),
        secure: false,
        protocol: 'http',
      };
      const options = getCookieOptions(req);
      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe('none');
    });

    test('sets secure: false and sameSite: lax for local development', () => {
      process.env.FRONTEND_URL = 'http://localhost:5173';
      const req = {
        get: jest.fn(() => ''),
        secure: false,
        protocol: 'http',
      };
      const options = getCookieOptions(req);
      expect(options.secure).toBe(false);
      expect(options.sameSite).toBe('lax');
    });

    test('sets secure: true when req.secure is true', () => {
      process.env.FRONTEND_URL = 'http://localhost:5173';
      const req = {
        get: jest.fn(() => ''),
        secure: true,
        protocol: 'https',
      };
      const options = getCookieOptions(req);
      expect(options.secure).toBe(true);
    });

    test('sets secure: true when protocol is https', () => {
      process.env.FRONTEND_URL = 'http://localhost:5173';
      const req = {
        get: jest.fn(() => ''),
        secure: false,
        protocol: 'https',
      };
      const options = getCookieOptions(req);
      expect(options.secure).toBe(true);
    });

    test('includes maxAge when provided', () => {
      const req = {
        get: jest.fn(() => ''),
        secure: false,
        protocol: 'http',
      };
      const options = getCookieOptions(req, 86400000);
      expect(options.maxAge).toBe(86400000);
    });

    test('does not include maxAge when not provided', () => {
      const req = {
        get: jest.fn(() => ''),
        secure: false,
        protocol: 'http',
      };
      const options = getCookieOptions(req);
      expect(options.maxAge).toBeUndefined();
    });

    test('detects cloud deployment from origin header with akpfoundries.com', () => {
      process.env.FRONTEND_URL = '';
      const req = {
        get: jest.fn((header) => {
          if (header === 'origin') return 'https://app.akpfoundries.com';
          return '';
        }),
        secure: false,
        protocol: 'http',
      };
      const options = getCookieOptions(req);
      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe('none');
    });
  });
});