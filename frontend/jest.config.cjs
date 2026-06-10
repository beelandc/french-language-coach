/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // Preset for TypeScript support
  preset: 'ts-jest',
  
  // Test environment - use jsdom for React component testing
  testEnvironment: 'jsdom',
  
  // Root directory
  rootDir: '.',
  
  // Test file patterns - only run jest-specific test files
  // Use .jest.test.ts or .jest.test.tsx to distinguish from vitest files
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/*.jest.test.[tj]s?(x)'
  ],
  
  // Transform configuration for TypeScript and ESM
  transform: {
    // Use ts-jest for .ts and .tsx files
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      tsconfig: 'tsconfig.jest.json'
    }],
    // Use babel-jest for MSW and other ESM node_modules
    '^.+\\.(js|mjs|cjs)$': 'babel-jest',
  },
  
  // Module file extensions to consider
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  
  // Module name mapper for path aliases
  // Maps path aliases from tsconfig to actual paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Collect coverage from these files
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.config.*',
    '!src/**/__tests__/**',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
    '!src/**/*.stories.*'
  ],
  
  // Coverage directory
  coverageDirectory: 'coverage/jest',
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Notifications
  notify: false,
  
  // Force exit to allow Jest to exit properly
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Transform ignore patterns - do NOT ignore any node_modules
  // We need to transform all node_modules because MSW and its dependencies are ESM
  // This will slow down tests but is necessary for ESM compatibility
  transformIgnorePatterns: [],
};
