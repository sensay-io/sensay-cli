import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { TrainingService } from '../generated/index';

export interface FileInfo {
  path: string;
  relativePath: string;
  content: string;
  size: number;
}

export class FileProcessor {
  private static readonly SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.log', '.pdf', '.docx'];
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (API limit)
  private static readonly TEXT_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.log'];
  private static readonly FILE_EXTENSIONS = ['.pdf', '.docx'];

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

  static async uploadTrainingFiles(replicaUuid: string, files: FileInfo[]): Promise<void> {
    console.log(chalk.blue(`\n📤 Uploading ${files.length} training files...`));
    
    for (const file of files) {
      const ext = path.extname(file.path).toLowerCase();
      
      try {
        if (FileProcessor.TEXT_EXTENSIONS.includes(ext)) {
          // For text files, use the text-based training approach
          await FileProcessor.uploadTextTraining(replicaUuid, file);
        } else if (FileProcessor.FILE_EXTENSIONS.includes(ext)) {
          // For binary files (PDF, DOCX), use the file upload approach
          await FileProcessor.uploadFileTraining(replicaUuid, file);
        }
      } catch (error: any) {
        console.error(chalk.red(`❌ Failed to upload ${file.relativePath}: ${error.message}`));
      }
    }
  }

  private static async uploadTextTraining(replicaUuid: string, file: FileInfo): Promise<void> {
    console.log(chalk.gray(`   Uploading text: ${file.relativePath}...`));
    
    // Step 1: Create knowledge base entry
    const createResponse = await TrainingService.postV1ReplicasTraining(replicaUuid);
    
    if (!createResponse.success || !createResponse.knowledgeBaseID) {
      throw new Error('Failed to create knowledge base entry');
    }
    
    // Step 2: Update with text content
    await TrainingService.putV1ReplicasTraining(
      replicaUuid,
      createResponse.knowledgeBaseID,
      {
        rawText: file.content
      }
    );
    
    console.log(chalk.green(`   ✅ ${file.relativePath} uploaded successfully`));
  }

  private static async uploadFileTraining(replicaUuid: string, file: FileInfo): Promise<void> {
    console.log(chalk.gray(`   Uploading file: ${file.relativePath}...`));
    
    // Step 1: Get signed URL for file upload
    const signedUrlResponse = await TrainingService.getV1ReplicasTrainingFilesUpload(
      replicaUuid,
      path.basename(file.path)
    );
    
    if (!signedUrlResponse.success || !signedUrlResponse.signedURL) {
      throw new Error('Failed to get signed upload URL');
    }
    
    // Step 2: Upload file to signed URL
    const fileBuffer = await fs.readFile(file.path);
    
    const uploadResponse = await fetch(signedUrlResponse.signedURL, {
      method: 'PUT',
      body: fileBuffer,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status: ${uploadResponse.status}`);
    }
    
    console.log(chalk.green(`   ✅ ${file.relativePath} uploaded successfully`));
  }
}