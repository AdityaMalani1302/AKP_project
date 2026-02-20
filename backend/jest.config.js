module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/__tests__/**/*.test.js',
    '<rootDir>/**/*.spec.js',
  ],
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    '!node_modules/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
