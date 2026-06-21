module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@workers/(.*)$': '<rootDir>/src/workers/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/fixtures/setupTestEnv.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  testTimeout: 30000,
  clearMocks: true,
};
