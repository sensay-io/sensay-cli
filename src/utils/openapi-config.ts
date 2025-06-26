import { OpenAPI } from '../generated/index';
import { SensayConfig } from '../types/api';

/**
 * Configure OpenAPI client with authentication and base URL
 * This should be called by all commands that use the Sensay API
 */
export function configureOpenAPI(config: SensayConfig): void {
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