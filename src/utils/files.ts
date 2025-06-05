import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { TrainingService } from '../generated/index';
import ora from 'ora';
import inquirer from 'inquirer';

export interface FileInfo {
  path: string;
  relativePath: string;
  content: string;
  size: number;
}

export interface UploadResult {
  file: FileInfo;
  success: boolean;
  knowledgeBaseID?: number;
  error?: string;
  attempts: number;
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

  static async uploadTrainingFiles(replicaUuid: string, files: FileInfo[], spinner?: any): Promise<UploadResult[]> {
    if (!spinner) {
      console.log(chalk.blue(`\n📤 Uploading ${files.length} training files...`));
    }
    
    const results: UploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (spinner) {
        spinner.text = `Uploading ${file.relativePath}... (${i + 1}/${files.length})`;
      }
      
      const result = await FileProcessor.uploadFileWithRetry(replicaUuid, file, 3, spinner);
      results.push(result);
      
      if (spinner) {
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        spinner.text = `Upload progress: ${successful} successful, ${failed} failed (${i + 1}/${files.length})`;
      } else {
        if (result.success) {
          console.log(chalk.green(`   ✅ ${result.file.relativePath} uploaded successfully`));
        } else {
          console.error(chalk.red(`   ❌ ${result.file.relativePath} failed after ${result.attempts} attempts: ${result.error}`));
        }
      }
    }
    
    // Summary of upload results (only show if not using spinner, as the spinner success message will show this)
    if (!spinner) {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(chalk.blue(`\n📊 Upload Summary:`));
      console.log(chalk.green(`   ✅ Successful: ${successful}`));
      if (failed > 0) {
        console.log(chalk.red(`   ❌ Failed: ${failed}`));
        console.log(chalk.yellow('\n⚠️  Failed uploads:'));
        results.filter(r => !r.success).forEach(r => {
          console.log(chalk.gray(`   - ${r.file.relativePath}: ${r.error}`));
        });
      }
    }
    
    return results;
  }

  private static async uploadFileWithRetry(replicaUuid: string, file: FileInfo, maxAttempts: number = 3, spinner?: any): Promise<UploadResult> {
    const ext = path.extname(file.path).toLowerCase();
    let lastError = '';
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          if (spinner) {
            spinner.text = `Retrying ${file.relativePath} (attempt ${attempt}/${maxAttempts})...`;
          } else {
            console.log(chalk.yellow(`   🔄 Retrying ${file.relativePath} (attempt ${attempt}/${maxAttempts})...`));
          }
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        
        let knowledgeBaseID: number;
        
        if (FileProcessor.TEXT_EXTENSIONS.includes(ext)) {
          knowledgeBaseID = await FileProcessor.uploadTextTraining(replicaUuid, file, !!spinner);
        } else if (FileProcessor.FILE_EXTENSIONS.includes(ext)) {
          knowledgeBaseID = await FileProcessor.uploadFileTraining(replicaUuid, file, !!spinner);
        } else {
          throw new Error(`Unsupported file type: ${ext}`);
        }
        
        return {
          file,
          success: true,
          knowledgeBaseID,
          attempts: attempt
        };
        
      } catch (error: any) {
        lastError = error.message || error.toString();
        if (attempt === maxAttempts) {
          break; // Don't continue if this was the last attempt
        }
      }
    }
    
    return {
      file,
      success: false,
      error: lastError,
      attempts: maxAttempts
    };
  }

  private static async uploadTextTraining(replicaUuid: string, file: FileInfo, silent: boolean = false): Promise<number> {
    if (!silent) {
      console.log(chalk.gray(`   Uploading text: ${file.relativePath}...`));
    }
    
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
    
    return createResponse.knowledgeBaseID;
  }

  private static async uploadFileTraining(replicaUuid: string, file: FileInfo, silent: boolean = false): Promise<number> {
    if (!silent) {
      console.log(chalk.gray(`   Uploading file: ${file.relativePath}...`));
    }
    
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
    
    if (!signedUrlResponse.knowledgeBaseID) {
      throw new Error('No knowledge base ID returned from upload');
    }
    
    return signedUrlResponse.knowledgeBaseID;
  }

  static async clearExistingTrainingData(replicaUuid: string, force: boolean = false, nonInteractive: boolean = false): Promise<void> {
    console.log(chalk.blue('\n🗄️  Checking existing training data...'));
    
    try {
      let totalDeleted = 0;
      let totalFailed = 0;
      let foundAnyEntries = false;
      let spinner: any = null;
      
      // Keep looping until no more training entries are found
      while (true) {
        // Get training entries for this replica
        const trainingResponse = await TrainingService.getV1Training1();
        
        if (!trainingResponse.success) {
          throw new Error('Failed to fetch existing training data');
        }
        
        // Filter entries for this replica
        const replicaEntries = trainingResponse.items.filter(
          (item: any) => item.replica_uuid === replicaUuid
        );
        
        if (replicaEntries.length === 0) {
          // No more entries found, we're done
          break;
        }
        
        if (!foundAnyEntries) {
          // First batch found - show count and ask for confirmation
          foundAnyEntries = true;
          console.log(chalk.yellow(`📊 Found ${replicaEntries.length} existing training entries`));
          
          // Ask for confirmation unless force flag is set
          if (!force) {
            if (nonInteractive) {
              throw new Error('Existing training data found. Use --force to automatically delete it, or run interactively to confirm.');
            }
            
            const { confirmDelete } = await inquirer.prompt({
              type: 'confirm',
              name: 'confirmDelete',
              message: 'This will delete all existing training data for this replica. Continue?',
              default: false
            });
            
            if (!confirmDelete) {
              console.log(chalk.yellow('⚠️  Training data deletion cancelled by user'));
              return;
            }
          }
          
          console.log(chalk.blue('🗑️  Clearing existing training data...'));
          spinner = ora('Deleting training entries...').start();
        }
        
        // Delete all entries in this batch
        for (const entry of replicaEntries) {
          try {
            await TrainingService.deleteV1Training(entry.id);
            totalDeleted++;
            spinner.text = `Deleting training entries... ${totalDeleted} deleted so far`;
          } catch (error: any) {
            totalFailed++;
            console.log(chalk.red(`\n❌ Failed to delete entry ${entry.id}: ${error.message}`));
            if (spinner) {
              spinner.text = `Deleting training entries... ${totalDeleted} deleted, ${totalFailed} failed`;
            }
          }
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!foundAnyEntries) {
        console.log(chalk.green('✅ No existing training data found - starting fresh'));
        return;
      }
      
      if (spinner) {
        spinner.succeed(chalk.green(`✅ Training data cleanup completed: ${totalDeleted} deleted, ${totalFailed} failed`));
      }
      
      if (totalFailed > 0) {
        console.log(chalk.yellow(`⚠️  ${totalFailed} entries could not be deleted - they may need manual cleanup`));
      }
      
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to clear existing training data: ${error.message}`));
      throw error;
    }
  }

  static async pollTrainingStatus(replicaUuid: string, uploadResults: UploadResult[], totalFiles: number): Promise<void> {
    const successfulUploads = uploadResults.filter(r => r.success);
    if (successfulUploads.length === 0) {
      console.log(chalk.yellow('\n⚠️  No files were uploaded successfully, skipping training status check.'));
      return;
    }

    console.log(chalk.blue(`\n🔄 Monitoring training progress for ${successfulUploads.length} files...`));
    
    const spinner = ora('Checking training status...').start();
    const knowledgeBaseIDs = successfulUploads.map(r => r.knowledgeBaseID!);
    
    try {
      let allReady = false;
      let attempts = 0;
      const maxAttempts = 360; // 30 minutes with 5-second intervals
      let latestTrainingResponse: any = null;
      
      while (!allReady && attempts < maxAttempts) {
        attempts++;
        
        // Get all training entries for this replica (handle pagination)
        let allReplicaEntries: any[] = [];
        let page = 1;
        
        while (true) {
          const trainingResponse = await TrainingService.getV1Training1(undefined, undefined, page.toString(), '100');
          
          if (!trainingResponse.success) {
            throw new Error('Failed to fetch training status');
          }
          
          const replicaEntriesInPage = trainingResponse.items.filter(
            (item: any) => item.replica_uuid === replicaUuid && knowledgeBaseIDs.includes(item.id)
          );
          
          allReplicaEntries.push(...replicaEntriesInPage);
          
          // If we got fewer items than the limit, we've reached the end
          if (trainingResponse.items.length < 100) {
            break;
          }
          
          page++;
        }
        
        latestTrainingResponse = { success: true, items: allReplicaEntries };
        const replicaEntries = allReplicaEntries;
        
        // Count entries by status
        const statusCounts: { [key: string]: number } = {};
        replicaEntries.forEach((entry: any) => {
          const status = entry.status;
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        // Create compact status display with priorities (most important statuses first)
        const statusPriority = ['ERR_FILE_PROCESSING', 'ERR_TEXT_PROCESSING', 'ERR_TEXT_TO_VECTOR', 'SYNC_ERROR', 'PROCESSING', 'READY', 'AWAITING_UPLOAD', 'SUPABASE_ONLY', 'BLANK'];
        const statusDisplay = statusPriority
          .filter(status => statusCounts[status] > 0)
          .map(status => `${status}: ${statusCounts[status]}`)
          .concat(
            // Add any other statuses not in the priority list
            Object.entries(statusCounts)
              .filter(([status]) => !statusPriority.includes(status))
              .map(([status, count]) => `${status}: ${count}`)
          )
          .join(' | ');
        
        const remainingTime = (maxAttempts - attempts) * 5; // seconds
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Show status breakdown - temporarily stop spinner to show clean status
        if (statusDisplay) {
          spinner.stop();
          console.log(chalk.blue(`📊 Training Status: ${statusDisplay} | Timeout in ${timeDisplay}`));
          spinner.start();
          spinner.text = `Monitoring training progress...`;
        } else {
          spinner.text = `Checking training status... - Timeout in ${timeDisplay}`;
        }
        
        const readyCount = statusCounts['READY'] || 0;
        const errorCount = Object.entries(statusCounts)
          .filter(([status]) => status.startsWith('ERR_') || status === 'SYNC_ERROR')
          .reduce((sum, [, count]) => sum + count, 0);
        
        if (readyCount === successfulUploads.length) {
          allReady = true;
          spinner.succeed(chalk.green(`✅ All ${successfulUploads.length} files have been processed and are ready!`));
        } else if (errorCount > 0) {
          spinner.warn(chalk.yellow(`⚠️  ${errorCount} files encountered errors during processing`));
          
          // Show which files had errors
          const errorEntries = replicaEntries.filter((entry: any) => 
            entry.status.startsWith('ERR_') || entry.status === 'SYNC_ERROR'
          );
          
          console.log(chalk.red('\n❌ Files with errors:'));
          errorEntries.forEach((entry: any) => {
            console.log(chalk.gray(`   - ID ${entry.id}: ${entry.status} ${entry.filename ? `(${entry.filename})` : ''}`));
          });
          
          allReady = true; // Stop polling as we have errors
        } else if (attempts >= maxAttempts) {
          spinner.fail(chalk.red('⏰ Training status check timed out after 30 minutes'));
          
          console.log(chalk.yellow('\n📊 Final status breakdown:'));
          Object.entries(statusCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([status, count]) => {
              let color = chalk.gray;
              if (status === 'READY') color = chalk.green;
              else if (status === 'PROCESSING') color = chalk.blue;
              else if (status.startsWith('ERR_') || status === 'SYNC_ERROR') color = chalk.red;
              else if (status === 'AWAITING_UPLOAD' || status === 'SUPABASE_ONLY') color = chalk.yellow;
              
              console.log(color(`   ${status}: ${count}`));
            });
          
          allReady = true;
        } else {
          // Wait 5 seconds before next check
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      // Verify file count matches (get all training entries for this replica)
      let allTrainingEntries: any[] = [];
      let page = 1;
      
      while (true) {
        const trainingResponse = await TrainingService.getV1Training1(undefined, undefined, page.toString(), '100');
        
        if (!trainingResponse.success) {
          break; // Don't fail the whole process if this verification fails
        }
        
        const replicaEntriesInPage = trainingResponse.items.filter(
          (item: any) => item.replica_uuid === replicaUuid
        );
        
        allTrainingEntries.push(...replicaEntriesInPage);
        
        // If we got fewer items than the limit, we've reached the end
        if (trainingResponse.items.length < 100) {
          break;
        }
        
        page++;
      }
      
      if (allTrainingEntries.length > 0) {
        const apiTrainingCount = allTrainingEntries.length;
        
        console.log(chalk.blue('\n📊 Training Status Summary:'));
        console.log(chalk.green(`   📁 Local files scanned: ${totalFiles}`));
        console.log(chalk.green(`   📤 Files uploaded: ${successfulUploads.length}`));
        console.log(chalk.green(`   🗄️  Files in training system: ${apiTrainingCount}`));
        
        if (apiTrainingCount !== totalFiles) {
          console.log(chalk.yellow(`\n⚠️  Mismatch detected: ${totalFiles} local files vs ${apiTrainingCount} in system`));
          
          // Show which files might be missing
          const apiEntries = latestTrainingResponse.items.filter((item: any) => item.replica_uuid === replicaUuid);
          const uploadedFileNames = successfulUploads.map(r => path.basename(r.file.path));
          const apiFileNames = apiEntries.map((entry: any) => entry.filename).filter(Boolean);
          
          const missingInApi = uploadedFileNames.filter(name => !apiFileNames.includes(name));
          if (missingInApi.length > 0) {
            console.log(chalk.red('\n❌ Files missing from training system:'));
            missingInApi.forEach((fileName: string) => {
              console.log(chalk.gray(`   - ${fileName}`));
            });
          }
        } else {
          console.log(chalk.green('✅ File count matches - all files are accounted for!'));
        }
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red(`Failed to check training status: ${error.message}`));
      throw error;
    }
  }
}