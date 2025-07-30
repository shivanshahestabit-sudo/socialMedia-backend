export default {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.test.cjs',
    '<rootDir>/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
    '!tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
  globalSetup: '<rootDir>/tests/setup/globalSetup.cjs',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.cjs'
};