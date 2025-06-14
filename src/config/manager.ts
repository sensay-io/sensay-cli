import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { SensayConfig } from '../types/api';

export interface ProjectConfig {
  organizationName?: string;
  userName?: string;
  userEmail?: string;
  replicaName?: string;
  organizationId?: string;
  userId?: string;
  replicaId?: string;
  apiKey?: string;
}

export class ConfigManager {
  private static readonly USER_CONFIG_DIR = path.join(os.homedir(), '.sensay');
  private static readonly USER_CONFIG_FILE = path.join(ConfigManager.USER_CONFIG_DIR, 'config.json');
  private static readonly PROJECT_CONFIG_FILE = './sensay.config.json';

  static async ensureUserConfigDir(): Promise<void> {
    await fs.ensureDir(ConfigManager.USER_CONFIG_DIR);
  }

  static async getUserConfig(): Promise<SensayConfig> {
    try {
      await ConfigManager.ensureUserConfigDir();
      if (await fs.pathExists(ConfigManager.USER_CONFIG_FILE)) {
        return await fs.readJson(ConfigManager.USER_CONFIG_FILE);
      }
    } catch (error) {
      console.warn('Failed to read user config:', error);
    }
    return {};
  }

  static async saveUserConfig(config: SensayConfig): Promise<void> {
    await ConfigManager.ensureUserConfigDir();
    await fs.writeJson(ConfigManager.USER_CONFIG_FILE, config, { spaces: 2 });
  }

  static async getProjectConfig(folderPath: string = '.'): Promise<ProjectConfig> {
    const configPath = path.join(folderPath, 'sensay.config.json');
    try {
      if (await fs.pathExists(configPath)) {
        return await fs.readJson(configPath);
      }
    } catch (error) {
      console.warn('Failed to read project config:', error);
    }
    return {};
  }

  static async saveProjectConfig(config: ProjectConfig, folderPath: string = '.'): Promise<void> {
    const configPath = path.join(folderPath, 'sensay.config.json');
    await fs.writeJson(configPath, config, { spaces: 2 });
  }

  static async getMergedConfig(folderPath: string = '.'): Promise<{ userConfig: SensayConfig; projectConfig: ProjectConfig }> {
    const [userConfig, projectConfig] = await Promise.all([
      ConfigManager.getUserConfig(),
      ConfigManager.getProjectConfig(folderPath)
    ]);

    return { userConfig, projectConfig };
  }

  static getConfigFromEnv(): Partial<SensayConfig> {
    return {
      apiKey: process.env.SENSAY_API_KEY,
      organizationId: process.env.SENSAY_ORGANIZATION_ID,
      userId: process.env.SENSAY_USER_ID,
      baseUrl: process.env.SENSAY_BASE_URL,
    };
  }

  static async getEffectiveConfig(folderPath: string = '.'): Promise<SensayConfig> {
    const envConfig = ConfigManager.getConfigFromEnv();
    const { userConfig, projectConfig } = await ConfigManager.getMergedConfig(folderPath);
    
    // Manual config merging to handle property descriptor issues
    const result: SensayConfig = {};
    
    // Merge userConfig
    for (const key in userConfig) {
      if (Object.prototype.hasOwnProperty.call(userConfig, key)) {
        (result as any)[key] = (userConfig as any)[key];
      }
    }
    
    // Merge projectConfig
    for (const key in projectConfig) {
      if (Object.prototype.hasOwnProperty.call(projectConfig, key)) {
        (result as any)[key] = (projectConfig as any)[key];
      }
    }
    
    // Merge envConfig (highest priority)
    for (const key in envConfig) {
      if (Object.prototype.hasOwnProperty.call(envConfig, key) && (envConfig as any)[key] !== undefined) {
        (result as any)[key] = (envConfig as any)[key];
      }
    }
    
    return result;
  }
}