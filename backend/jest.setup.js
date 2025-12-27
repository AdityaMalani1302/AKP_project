// Jest setup for backend tests
// Add any global test configuration here

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';

// Global teardown
afterAll(async () => {
  // Close database connections if needed
});
