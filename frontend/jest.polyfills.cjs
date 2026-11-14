// Jest polyfills, loaded via `setupFiles` before the test environment's modules.
// jsdom doesn't provide TextEncoder/TextDecoder, which react-router v7 needs at
// import time (first needed by the Issue #237 admin metrics dashboard tests).
const { TextEncoder, TextDecoder } = require('util')

if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, { TextEncoder, TextDecoder })
}
