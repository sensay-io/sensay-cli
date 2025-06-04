import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { SensayConfig } from '../types/api.js';

export interface ProjectConfig {
  organizationName?: string;
  userName?: string;
  userEmail?: string;
  replicaName?: string;
  organizationId?: string;
  userId?: string;
  replicaId?: string;
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
    const { userConfig } = await ConfigManager.getMergedConfig(folderPath);
    
    return {
      ...userConfig,
      ...envConfig,
    };
  }
}