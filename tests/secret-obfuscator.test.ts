import { obfuscateSecret, obfuscateHeaders, obfuscateUrl, obfuscateBody } from '../src/utils/secret-obfuscator';

describe('Secret Obfuscator', () => {
  describe('obfuscateSecret', () => {
    it('should obfuscate long secrets showing first 4 and last 4 characters', () => {
      expect(obfuscateSecret('sk-1234567890abcdef')).toBe('sk-1...cdef');
      expect(obfuscateSecret('test-api-key-12345')).toBe('test...2345');
    });

    it('should fully mask short secrets', () => {
      expect(obfuscateSecret('1234')).toBe('****');
      expect(obfuscateSecret('12345678')).toBe('********');
    });

    it('should handle empty or null values', () => {
      expect(obfuscateSecret('')).toBe('');
      expect(obfuscateSecret(null as any)).toBe('');
      expect(obfuscateSecret(undefined as any)).toBe('');
    });
  });

  describe('obfuscateHeaders', () => {
    it('should obfuscate sensitive headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        'X-Organization-Secret': 'sk-1234567890abcdef',
        'x-api-key': 'test-key-123456789',
        'Authorization': 'Bearer token123456789',
        'X-User-ID': 'user-12345',
      };

      const obfuscated = obfuscateHeaders(headers);
      
      expect(obfuscated['Content-Type']).toBe('application/json');
      expect(obfuscated['X-Organization-Secret']).toBe('sk-1...cdef');
      expect(obfuscated['x-api-key']).toBe('test...6789');
      expect(obfuscated['Authorization']).toBe('Bear...6789');
      expect(obfuscated['X-User-ID']).toBe('user...2345');
    });

    it('should handle case-insensitive header names', () => {
      const headers = {
        'X-ORGANIZATION-SECRET': 'secret123456789',
        'x-organization-secret': 'anothersecret123',
      };

      const obfuscated = obfuscateHeaders(headers);
      
      expect(obfuscated['X-ORGANIZATION-SECRET']).toBe('secr...6789');
      expect(obfuscated['x-organization-secret']).toBe('anot...t123');
    });
  });

  describe('obfuscateUrl', () => {
    it('should obfuscate API keys in query parameters', () => {
      expect(obfuscateUrl('https://api.example.com?api_key=sk1234567890'))
        .toBe('https://api.example.com?api_key=sk12...7890');
      
      expect(obfuscateUrl('https://api.example.com?token=secret123456&other=value'))
        .toBe('https://api.example.com?token=secr...3456&other=value');
    });

    it('should handle multiple sensitive parameters', () => {
      const url = 'https://api.example.com?apikey=key123456&token=tok789012&normal=value';
      const obfuscated = obfuscateUrl(url);
      
      expect(obfuscated).toContain('apikey=key1...3456');
      expect(obfuscated).toContain('token=tok7...9012');
      expect(obfuscated).toContain('normal=value');
    });

    it('should be case-insensitive for parameter names', () => {
      expect(obfuscateUrl('https://api.example.com?API_KEY=sk1234567890'))
        .toBe('https://api.example.com?API_KEY=sk12...7890');
    });
  });

  describe('obfuscateBody', () => {
    it('should obfuscate sensitive fields in objects', () => {
      const body = {
        name: 'John Doe',
        apiKey: 'sk-1234567890abcdef',
        api_key: 'another-secret-key',
        password: 'supersecret123',
        normalField: 'visible value',
      };

      const obfuscated = obfuscateBody(body);
      
      expect(obfuscated.name).toBe('John Doe');
      expect(obfuscated.apiKey).toBe('sk-1...cdef');
      expect(obfuscated.api_key).toBe('anot...-key');
      expect(obfuscated.password).toBe('supe...t123');
      expect(obfuscated.normalField).toBe('visible value');
    });

    it('should handle nested objects', () => {
      const body = {
        user: {
          name: 'John',
          apiSecret: 'secret123456789',
        },
        config: {
          token: 'token987654321',
        },
      };

      const obfuscated = obfuscateBody(body);
      
      expect(obfuscated.user.name).toBe('John');
      expect(obfuscated.user.apiSecret).toBe('secr...6789');
      expect(obfuscated.config.token).toBe('toke...4321');
    });

    it('should return non-object values as-is', () => {
      expect(obfuscateBody('string')).toBe('string');
      expect(obfuscateBody(123)).toBe(123);
      expect(obfuscateBody(null)).toBe(null);
      expect(obfuscateBody(undefined)).toBe(undefined);
    });

    it('should not modify the original object', () => {
      const body = { apiKey: 'secret123456' };
      const obfuscated = obfuscateBody(body);
      
      expect(body.apiKey).toBe('secret123456');
      expect(obfuscated.apiKey).toBe('secr...3456');
    });
  });
});