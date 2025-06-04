import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

export interface FileInfo {
  path: string;
  relativePath: string;
  content: string;
  size: number;
}

export class FileProcessor {
  private static readonly SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.log'];
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  static async readSystemMessage(folderPath: string): Promise<string | null> {
    const systemMessagePath = path.join(folderPath, 'system-message.txt');
    
    try {
      if (await fs.pathExists(systemMessagePath)) {
        return await fs.readFile(systemMessagePath, 'utf-8');
      }
    } catch (error) {
      console.error(chalk.red(`Error reading system-message.txt: ${error}`));
    }
    
    return null;
  }

  static async scanTrainingFiles(folderPath: string): Promise<{ files: FileInfo[]; skipped: string[] }> {
    const trainingDataPath = path.join(folderPath, 'training-data');
    const files: FileInfo[] = [];
    const skipped: string[] = [];

    if (!await fs.pathExists(trainingDataPath)) {
      return { files, skipped };
    }

    await FileProcessor.scanDirectory(trainingDataPath, trainingDataPath, files, skipped);
    
    return { files, skipped };
  }

  private static async scanDirectory(
    dirPath: string, 
    basePath: string, 
    files: FileInfo[], 
    skipped: string[]
  ): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      if (entry.isDirectory()) {
        await FileProcessor.scanDirectory(fullPath, basePath, files, skipped);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        
        if (!FileProcessor.SUPPORTED_EXTENSIONS.includes(ext)) {
          skipped.push(relativePath);
          continue;
        }

        try {
          const stats = await fs.stat(fullPath);
          
          if (stats.size > FileProcessor.MAX_FILE_SIZE) {
            skipped.push(`${relativePath} (too large: ${FileProcessor.formatFileSize(stats.size)})`);
            continue;
          }

          const content = await fs.readFile(fullPath, 'utf-8');
          
          files.push({
            path: fullPath,
            relativePath,
            content,
            size: stats.size,
          });
        } catch (error) {
          skipped.push(`${relativePath} (read error: ${error})`);
        }
      }
    }
  }

  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }

  static displayFilesSummary(files: FileInfo[], skipped: string[]): void {
    console.log(chalk.blue('\n📁 File Processing Summary:'));
    
    if (files.length > 0) {
      console.log(chalk.green(`✅ ${files.length} files will be processed:`));
      files.forEach(file => {
        console.log(`   ${chalk.cyan(file.relativePath)} (${FileProcessor.formatFileSize(file.size)})`);
      });
    }

    if (skipped.length > 0) {
      console.log(chalk.yellow(`⚠️  ${skipped.length} files skipped:`));
      skipped.forEach(file => {
        console.log(`   ${chalk.gray(file)}`);
      });
    }

    if (files.length === 0 && skipped.length === 0) {
      console.log(chalk.yellow('⚠️  No training files found in training-data folder'));
    }
  }
}