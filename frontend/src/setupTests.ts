// Jest setup file for frontend tests
// This file is automatically loaded before each test file

// Import runtime - this extends expect with jest-dom matchers
// Note: Using require to avoid ESM issues
const jestDom = require('@testing-library/jest-dom');

// Extend expect with jest-dom matchers
expect.extend(jestDom);

// Note: MSW setup is commented out due to ESM/CommonJS compatibility issues
// MSW can still be used with dynamic imports in test files
// import { server } from './mocks/server';

// Establish API mocking before all tests
// beforeAll(() => {
//   server.listen({ onUnhandledRequest: 'error' });
// });

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
// afterEach(() => {
//   server.resetHandlers();
// });

// Clean up after the tests are finished
// afterAll(() => {
//   server.close();
// });
