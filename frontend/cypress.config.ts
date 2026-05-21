import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    // Base URL for the application under test
    baseUrl: 'http://localhost:5173',
    
    // Spec files pattern
    specPattern: 'cypress/e2e/**/*.{cy,spec}.{js,jsx,ts,tsx}',
    
    // Support files
    supportFile: 'cypress/support/index.ts',
    
    // Setup node events
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    
    // Browser configuration
    browser: 'chrome',
    
    // Disable web security for cross-origin testing (needed for API mocking)
    chromeWebSecurity: false,
    
    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Video recording (disabled by default)
    video: false,
    
    // Screenshots (enabled for debugging)
    screenshotOnRunFailure: true,
    screenshotsFolder: 'cypress/screenshots',
    
    // Test retries
    retries: {
      runMode: 2,
      openMode: 0,
    },
    
    // Default command timeout
    defaultCommandTimeout: 4000,
    
    // Exec timeout
    execTimeout: 4000,
    
    // Task timeout
    taskTimeout: 4000,
    
    // Page load timeout
    pageLoadTimeout: 60000,
    
    // Request timeout
    requestTimeout: 5000,
    
    // Response timeout
    responseTimeout: 30000,
  },
  
  // Component testing (not used for E2E but configured for completeness)
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'cypress/component/**/*.{cy,spec}.{js,jsx,ts,tsx}',
  },
  
  // Global settings
  env: {
    // Environment variables for tests
    apiUrl: 'http://localhost:8000',
  },
  
  // Folders
  fixturesFolder: 'cypress/fixtures',
  downloadsFolder: 'cypress/downloads',
  videosFolder: 'cypress/videos',
  
  // TypeScript support
  tsConfig: 'cypress/tsconfig.json',
  
  // Reporter options
  reporter: 'spec',
  reporterOptions: {
    overwrite: false,
    html: false,
    json: true,
  },
})
