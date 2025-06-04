"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreConsole = exports.suppressConsole = void 0;
// Test setup file
process.env.NODE_ENV = 'test';
// Suppress console output during tests unless explicitly testing it
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
beforeEach(() => {
    // Restore console methods for each test
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
});
// Helper to suppress console output
const suppressConsole = () => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
};
exports.suppressConsole = suppressConsole;
// Helper to restore console output
const restoreConsole = () => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
};
exports.restoreConsole = restoreConsole;
//# sourceMappingURL=setup.js.map