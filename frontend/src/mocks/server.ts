// MSW Server Setup for Node.js environment (Jest tests)

// Import from msw - babel-jest will transform this
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create a server instance with all handlers
// This is used for Node.js environment (Jest tests)
export const server = setupServer(...handlers);

// Export handlers for use in browser tests if needed
export { handlers };
