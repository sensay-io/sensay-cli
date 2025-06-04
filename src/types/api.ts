export interface SensayConfig {
  apiKey?: string;
  organizationId?: string;
  userId?: string;
  baseUrl?: string;
}

export interface ApiKeyClaimRequest {
  organizationName: string;
  name: string;
  email: string;
}

export interface ApiKeyClaimResponse {
  organizationSecret: string;
  organizationId: string;
  expirationDate?: string;
}

export interface CreateUserRequest {
  name: string;
  email?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
}

export interface CreateReplicaRequest {
  name: string;
  systemMessage?: string;
}

export interface Replica {
  id: string;
  name: string;
  systemMessage?: string;
  status?: string;
}

export interface TrainingFile {
  path: string;
  content: string;
  status?: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface TrainingStatus {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  files?: TrainingFile[];
}