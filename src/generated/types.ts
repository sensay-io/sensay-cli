// Generated types for Sensay API

export interface SensayErrorResponse {
  success: false;
  error: string;
  fingerprint?: string;
  request_id: string;
}

export interface ApiKeyClaimRequest {
  organizationName: string;
  name: string;
  email: string;
}

export interface ApiKeyClaimResponse {
  success: true;
  apiKey: string;
  organizationID: string;
  validUntil: string | null;
}

export interface CreateUserRequest {
  name: string;
  email?: string;
}

export interface User {
  uuid: string;
  name: string;
  email?: string;
  created_at: string;
}

export interface CreateReplicaRequest {
  name: string;
  shortDescription: string;
  greeting: string;
  ownerID: string;
  slug: string;
  llm: {
    model?: string;
    memoryMode?: string;
    systemMessage?: string;
    tools?: string[];
  };
  type?: 'individual' | 'character' | 'brand';
  private?: boolean;
  whitelistEmails?: string[];
  tags?: string[];
  profileImage?: string;
  suggestedQuestions?: string[];
  purpose?: string;
  voicePreviewText?: string;
}

export interface Replica {
  uuid: string;
  name: string;
  shortDescription: string;
  greeting: string;
  ownerID: string;
  slug: string;
  llm: {
    model: string;
    memoryMode: string;
    systemMessage?: string;
    tools: string[];
  };
  type: 'individual' | 'character' | 'brand';
  private: boolean;
  whitelistEmails: string[];
  tags: string[];
  profileImage: string;
  suggestedQuestions: string[];
  created_at: string;
  chat_history_count: number | null;
  voice_enabled: boolean;
  video_enabled: boolean;
}

export interface ReplicasListResponse {
  success: true;
  type: string;
  items: Replica[];
  total: number;
}

export interface CreateReplicaResponse {
  success: true;
  uuid: string;
}

export interface UserResponse {
  success: true;
  user: User;
}

export class SensayApiError extends Error {
  public readonly status: number;
  public readonly response: SensayErrorResponse;
  public readonly fingerprint?: string;
  public readonly requestId: string;

  constructor(status: number, response: SensayErrorResponse) {
    super(response.error);
    this.name = 'SensayApiError';
    this.status = status;
    this.response = response;
    this.fingerprint = response.fingerprint;
    this.requestId = response.request_id;
  }
}