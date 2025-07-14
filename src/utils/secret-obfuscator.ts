export function obfuscateSecret(secret: string): string {
  if (!secret || secret.length <= 8) {
    return '*'.repeat(secret?.length || 0);
  }
  
  const firstFour = secret.substring(0, 4);
  const lastFour = secret.substring(secret.length - 4);
  return `${firstFour}...${lastFour}`;
}

export function obfuscateHeaders(headers: Record<string, any>): Record<string, any> {
  const obfuscatedHeaders = { ...headers };
  const sensitiveKeys = [
    'x-organization-secret',
    'x-api-key',
    'authorization',
    'x-user-id',
    'x-vercel-protection-bypass-token'
  ];
  
  for (const key of Object.keys(obfuscatedHeaders)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      obfuscatedHeaders[key] = obfuscateSecret(obfuscatedHeaders[key]);
    }
  }
  
  return obfuscatedHeaders;
}

export function obfuscateUrl(url: string): string {
  // Obfuscate API keys in URLs
  return url.replace(/(\?|&)(api_key|apikey|key|token)=([^&]+)/gi, (match, prefix, param, value) => {
    return `${prefix}${param}=${obfuscateSecret(value)}`;
  });
}

export function obfuscateBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const obfuscatedBody = JSON.parse(JSON.stringify(body));
  const sensitiveKeys = ['apiKey', 'api_key', 'secret', 'token', 'password', 'apiSecret'];
  
  function obfuscateObject(obj: any): void {
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        if (typeof obj[key] === 'string') {
          obj[key] = obfuscateSecret(obj[key]);
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        obfuscateObject(obj[key]);
      }
    }
  }
  
  obfuscateObject(obfuscatedBody);
  return obfuscatedBody;
}