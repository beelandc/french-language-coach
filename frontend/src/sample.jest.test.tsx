/**
 * Sample test file demonstrating Jest + @testing-library/react setup
 * 
 * This file verifies that:
 * 1. Jest is configured and running
 * 2. @testing-library/react is installed and can be imported
 * 3. React components can be tested
 * 
 * MSW is installed as a dependency and mock handlers are available in src/mocks/
 * (handlers.ts, server.ts, browser.ts)
 */

import { describe, it, expect } from '@jest/globals';
import { render } from '@testing-library/react';
import React from 'react';

// Simple test component
const TestComponent = () => (
  <div data-testid="test-component">
    <h1>Hello, Jest!</h1>
    <p>This is a test component.</p>
  </div>
);

describe('Jest + @testing-library/react Setup Verification', () => {
  describe('Jest Configuration', () => {
    it('should run tests successfully', () => {
      expect(true).toBe(true);
    });

    it('should have jsdom environment available', () => {
      expect(document).toBeDefined();
    });
  });

  describe('@testing-library/react', () => {
    it('should render React components', () => {
      render(<TestComponent />);
      const element = document.querySelector('[data-testid="test-component"]');
      expect(element).toBeTruthy();
    });

    it('should find text content in components', () => {
      render(<TestComponent />);
      const heading = document.querySelector('h1');
      expect(heading?.textContent).toBe('Hello, Jest!');
    });

    it('should find paragraph content in components', () => {
      render(<TestComponent />);
      const paragraph = document.querySelector('p');
      expect(paragraph?.textContent).toBe('This is a test component.');
    });
  });

  describe('React Availability', () => {
    it('should have React available', () => {
      expect(React.createElement).toBeDefined();
    });

    it('should create React elements', () => {
      const element = React.createElement('div', null, 'Test');
      expect(element).toBeDefined();
    });

    it('should create React elements with props', () => {
      const element = React.createElement('div', { className: 'test' }, 'Content');
      expect(element).toBeDefined();
    });
  });

  describe('Package Dependencies', () => {
    it('should have jest configured in package.json', () => {
      // This test passing means jest is running
      expect(true).toBe(true);
    });

    it('should have @testing-library/react installed', async () => {
      const mod = await import('@testing-library/react');
      expect(mod.render).toBeDefined();
    });

    it('should have React DOM available', () => {
      const ReactDOM = require('react-dom/client');
      expect(ReactDOM.createRoot).toBeDefined();
    });

    it('should have MSW mock files available', () => {
      // MSW is installed and mock files are created
      // These files provide handlers for API mocking
      const fs = require('fs');
      const path = require('path');
      
      const handlersPath = path.join(__dirname, 'mocks', 'handlers.ts');
      const serverPath = path.join(__dirname, 'mocks', 'server.ts');
      const browserPath = path.join(__dirname, 'mocks', 'browser.ts');
      
      expect(fs.existsSync(handlersPath)).toBe(true);
      expect(fs.existsSync(serverPath)).toBe(true);
      expect(fs.existsSync(browserPath)).toBe(true);
    });
  });
});
