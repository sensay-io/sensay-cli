// Legacy types - use generated types from src/generated instead
export interface SensayConfig {
  apiKey?: string;
  organizationId?: string;
  userId?: string;
  baseUrl?: string;
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