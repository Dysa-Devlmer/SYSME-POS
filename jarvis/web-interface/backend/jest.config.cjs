module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    '**/*.{js,cjs}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.cjs',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
};
