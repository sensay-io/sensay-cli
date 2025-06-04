import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import {
  SensayErrorResponse,
  SensayApiError,
  ApiKeyClaimRequest,
  ApiKeyClaimResponse,
  CreateUserRequest,
  UserResponse,
  CreateReplicaRequest,
  CreateReplicaResponse,
  ReplicasListResponse,
  Replica
} from './types';

export interface SensayApiConfig {
  baseURL?: string;
  apiKey?: string;
  organizationId?: string;
  userId?: string;
  timeout?: number;
}

export class SensayApiClient {
  private client: AxiosInstance;

  constructor(config: SensayApiConfig = {}) {
    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.sensay.io',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '2025-03-25',
      },
    });

    // Set authentication headers if provided
    if (config.apiKey) {
      this.client.defaults.headers['X-ORGANIZATION-SECRET'] = config.apiKey;
    }
    if (config.userId) {
      this.client.defaults.headers['X-USER-ID'] = config.userId;
      this.client.defaults.headers['X-USER-ID-TYPE'] = 'string';
    }

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response && error.response.data) {
          const data = error.response.data as any;
          if (data.success === false && data.error) {
            const errorData: SensayErrorResponse = {
              success: false,
              error: data.error,
              fingerprint: data.fingerprint,
              request_id: data.request_id || 'unknown'
            };
            throw new SensayApiError(error.response.status, errorData);
          }
        }
        throw error;
      }
    );
  }

  // Update authentication headers
  setApiKey(apiKey: string): void {
    this.client.defaults.headers['X-ORGANIZATION-SECRET'] = apiKey;
  }

  setUserId(userId: string): void {
    this.client.defaults.headers['X-USER-ID'] = userId;
    this.client.defaults.headers['X-USER-ID-TYPE'] = 'string';
  }

  // API Key Management
  async claimApiKey(code: string, request: ApiKeyClaimRequest): Promise<ApiKeyClaimResponse> {
    const response = await this.client.post<ApiKeyClaimResponse>(
      `/v1/api-keys/invites/${code}/redeem`,
      request
    );
    return response.data;
  }

  // User Management
  async createUser(request: CreateUserRequest): Promise<UserResponse> {
    const response = await this.client.post<UserResponse>('/v1/users', request);
    return response.data;
  }

  async getCurrentUser(): Promise<UserResponse> {
    const response = await this.client.get<UserResponse>('/v1/users/me');
    return response.data;
  }

  async updateCurrentUser(request: Partial<CreateUserRequest>): Promise<UserResponse> {
    const response = await this.client.put<UserResponse>('/v1/users/me', request);
    return response.data;
  }

  async deleteCurrentUser(): Promise<void> {
    await this.client.delete('/v1/users/me');
  }

  // Replica Management
  async createReplica(request: CreateReplicaRequest): Promise<CreateReplicaResponse> {
    const response = await this.client.post<CreateReplicaResponse>('/v1/replicas', request);
    return response.data;
  }

  async getReplicas(params?: {
    owner_uuid?: string;
    ownerID?: string;
    page?: number;
    page_size?: number;
    slug?: string;
    search?: string;
    tags?: string[];
    sort?: 'name' | 'popularity';
    integration?: 'telegram' | 'discord';
  }): Promise<ReplicasListResponse> {
    const response = await this.client.get<ReplicasListResponse>('/v1/replicas', { params });
    return response.data;
  }

  async getReplica(uuid: string): Promise<Replica> {
    const response = await this.client.get<Replica>(`/v1/replicas/${uuid}`);
    return response.data;
  }

  async updateReplica(uuid: string, request: Partial<CreateReplicaRequest>): Promise<void> {
    await this.client.put(`/v1/replicas/${uuid}`, request);
  }

  async deleteReplica(uuid: string): Promise<void> {
    await this.client.delete(`/v1/replicas/${uuid}`);
  }

  // Training Data Management
  async uploadTrainingData(replicaUuid: string, files: { filename: string; content: string }[]): Promise<void> {
    for (const file of files) {
      await this.client.post(`/v1/replicas/${replicaUuid}/training`, {
        filename: file.filename,
        content: file.content,
      });
    }
  }

  async clearTrainingData(replicaUuid: string): Promise<void> {
    await this.client.delete(`/v1/replicas/${replicaUuid}/training`);
  }

  async getTrainingStatus(replicaUuid: string): Promise<any> {
    const response = await this.client.get(`/v1/replicas/${replicaUuid}/training/status`);
    return response.data;
  }

  // Utility method to check if error is a SensayApiError
  static isSensayApiError(error: any): error is SensayApiError {
    return error instanceof SensayApiError;
  }
}