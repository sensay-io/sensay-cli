import { OpenAPI } from '../generated/index';
import { SensayConfig } from '../types/api';
import chalk from 'chalk';
import { obfuscateHeaders, obfuscateUrl, obfuscateBody } from './secret-obfuscator';

// Store the original fetch function
const originalFetch = global.fetch;

// Track if we've already installed our fetch interceptor
let fetchInterceptorInstalled = false;

// Global verbose settings
let verboseLevel = 0;

/**
 * Configure OpenAPI client with authentication and base URL
 * This should be called by all commands that use the Sensay API
 */
export function configureOpenAPI(config: SensayConfig & { verbose?: boolean; veryVerbose?: boolean }): void {
  // Set verbose level
  if (config.veryVerbose) {
    verboseLevel = 2;
  } else if (config.verbose) {
    verboseLevel = 1;
  } else {
    verboseLevel = 0;
  }

  // Install fetch interceptor once
  if (!fetchInterceptorInstalled && verboseLevel > 0) {
    installFetchInterceptor();
    fetchInterceptorInstalled = true;
  }

  // Set base URL if provided, otherwise use default
  if (config.baseUrl) {
    OpenAPI.BASE = config.baseUrl;
  }

  // Configure headers
  const headers: Record<string, string> = {
    'X-API-Version': '2025-03-25',
  };

  // Add API key if available
  if (config.apiKey) {
    headers['X-ORGANIZATION-SECRET'] = config.apiKey;
  }

  // Add user ID if available
  if (config.userId) {
    headers['X-USER-ID'] = config.userId;
  }

  // Add Vercel protection bypass header if configured
  if (config.vercelProtectionBypass) {
    headers['x-vercel-protection-bypass'] = config.vercelProtectionBypass;
  }

  OpenAPI.HEADERS = headers;
}

/**
 * Install a fetch interceptor for verbose logging
 */
function installFetchInterceptor(): void {
  global.fetch = async (input: any, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    const startTime = Date.now();

    // Log request based on verbose level
    if (verboseLevel >= 1) {
      console.error(chalk.cyan(`\n→ ${method} ${obfuscateUrl(url)}`));
      
      if (verboseLevel >= 2 && init) {
        // Log headers for -vv
        if (init.headers) {
          const headers = init.headers instanceof Headers 
            ? Object.fromEntries(init.headers.entries())
            : Array.isArray(init.headers)
            ? Object.fromEntries(init.headers)
            : init.headers;
          
          console.error(chalk.gray('  Headers:'));
          const obfuscatedHeaders = obfuscateHeaders(headers);
          for (const [key, value] of Object.entries(obfuscatedHeaders)) {
            console.error(chalk.gray(`    ${key}: ${value}`));
          }
        }
        
        // Log body for -vv
        if (init.body) {
          console.error(chalk.gray('  Body:'));
          if (typeof init.body === 'string') {
            try {
              const parsed = JSON.parse(init.body);
              const obfuscated = obfuscateBody(parsed);
              console.error(chalk.gray('    ' + JSON.stringify(obfuscated, null, 2).split('\n').join('\n    ')));
            } catch {
              console.error(chalk.gray(`    ${init.body}`));
            }
          } else {
            console.error(chalk.gray('    [Binary data]'));
          }
        }
      }
    }

    try {
      // Make the actual request
      const response = await originalFetch(input, init);
      const duration = Date.now() - startTime;
      
      // Clone response to read body without consuming it
      const clonedResponse = response.clone();
      
      // Log response based on verbose level
      if (verboseLevel >= 1) {
        const statusColor = response.ok ? chalk.green : chalk.red;
        console.error(statusColor(`← ${response.status} ${response.statusText} (${duration}ms)`));
        
        // For errors with -v, also show response body
        if (!response.ok) {
          try {
            const errorBody = await clonedResponse.text();
            if (errorBody) {
              console.error(chalk.red('  Error Body:'));
              try {
                const parsed = JSON.parse(errorBody);
                console.error(chalk.red('    ' + JSON.stringify(parsed, null, 2).split('\n').join('\n    ')));
              } catch {
                console.error(chalk.red(`    ${errorBody}`));
              }
            }
          } catch {
            // Ignore errors reading response body
          }
        }
        
        if (verboseLevel >= 2) {
          // Log response headers for -vv
          console.error(chalk.gray('  Response Headers:'));
          response.headers.forEach((value, key) => {
            console.error(chalk.gray(`    ${key}: ${value}`));
          });
          
          // Log response body for -vv (only if successful)
          if (response.ok) {
            try {
              const responseBody = await clonedResponse.text();
              if (responseBody) {
                console.error(chalk.gray('  Response Body:'));
                try {
                  const parsed = JSON.parse(responseBody);
                  const obfuscated = obfuscateBody(parsed);
                  console.error(chalk.gray('    ' + JSON.stringify(obfuscated, null, 2).split('\n').join('\n    ')));
                } catch {
                  console.error(chalk.gray(`    ${responseBody.substring(0, 500)}${responseBody.length > 500 ? '...' : ''}`));
                }
              }
            } catch {
              // Ignore errors reading response body
            }
          }
        }
      }
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (verboseLevel >= 1) {
        console.error(chalk.red(`← Network Error (${duration}ms)`));
        console.error(chalk.red(`  ${error}`));
      }
      
      throw error;
    }
  };
}