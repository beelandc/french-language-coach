// MSW Browser Setup for browser-based tests

import { setupWorker } from 'msw';
import { handlers } from './handlers';

// Create a worker instance for browser environment
// This is used for browser-based tests (e.g., with @testing-library/react in browser mode)
// Note: For Jest tests running in Node, use server.ts instead
export const worker = setupWorker(...handlers);

// Start the worker
// This should be called in your test setup or beforeAll
export const startWorker = async () => {
  await worker.start({
    onUnhandledRequest: 'bypass', // or 'error' for stricter mode
  });
};

// Stop the worker
// This should be called in your test teardown or afterAll
export const stopWorker = async () => {
  await worker.stop();
};

// Reset handlers
export const resetWorkerHandlers = () => {
  worker.resetHandlers();
};

export { handlers };
