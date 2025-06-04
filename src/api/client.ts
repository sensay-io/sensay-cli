import axios, { AxiosInstance } from 'axios';
import { SensayConfig, ApiKeyClaimRequest, ApiKeyClaimResponse, CreateUserRequest, User, CreateReplicaRequest, Replica } from '../types/api.js';

export class SensayApiClient {
  private client: AxiosInstance;
  private config: SensayConfig;

  constructor(config: SensayConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.sensay.io',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '2025-03-25',
      },
    });

    if (config.apiKey) {
      this.client.defaults.headers['X-ORGANIZATION-SECRET'] = config.apiKey;
    }
    if (config.userId) {
      this.client.defaults.headers['X-USER-ID'] = config.userId;
      this.client.defaults.headers['X-USER-ID-TYPE'] = 'string';
    }
  }

  async claimApiKey(code: string, request: ApiKeyClaimRequest): Promise<ApiKeyClaimResponse> {
    const response = await this.client.post(`/v1/api-keys/invites/${code}/redeem`, request);
    return response.data;
  }

  async createUser(request: CreateUserRequest): Promise<User> {
    const response = await this.client.post('/v1/users', request);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/v1/users/me');
    return response.data;
  }

  async createReplica(request: CreateReplicaRequest): Promise<Replica> {
    const response = await this.client.post('/v1/replicas', request);
    return response.data;
  }

  async getReplicas(): Promise<Replica[]> {
    const response = await this.client.get('/v1/replicas');
    return response.data.replicas || [];
  }

  async updateReplicaSystemMessage(replicaId: string, systemMessage: string): Promise<void> {
    await this.client.put(`/v1/replicas/${replicaId}`, { systemMessage });
  }

  async uploadTrainingData(replicaId: string, files: { name: string; content: string }[]): Promise<void> {
    for (const file of files) {
      await this.client.post(`/v1/replicas/${replicaId}/training`, {
        filename: file.name,
        content: file.content,
      });
    }
  }

  async clearTrainingData(replicaId: string): Promise<void> {
    await this.client.delete(`/v1/replicas/${replicaId}/training`);
  }

  async getTrainingStatus(replicaId: string): Promise<any> {
    const response = await this.client.get(`/v1/replicas/${replicaId}/training/status`);
    return response.data;
  }
}