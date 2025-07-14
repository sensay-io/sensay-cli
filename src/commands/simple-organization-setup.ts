import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs-extra';
import { 
  ApiError, 
  UsersService, 
  ReplicasService
} from '../generated/index';
import { ConfigManager } from '../config/manager';
import { FileProcessor } from '../utils/files';
import { ProgressManager } from '../utils/progress';
import { configureOpenAPI } from '../utils/openapi-config';

interface SetupOptions {
  folderPath?: string;
  userName?: string;
  userEmail?: string;
  replicaName?: string;
  nonInteractive?: boolean;
  force?: boolean;
  verbose?: boolean;
  veryVerbose?: boolean;
}

interface ReplicaFolder {
  path: string;
  name: string;
  modelName?: string;
  systemMessage?: string;
}

async function scanForReplicaFolders(targetPath: string): Promise<ReplicaFolder[]> {
  const replicaFolders: ReplicaFolder[] = [];
  
  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = path.join(targetPath, entry.name);
        
        // Check if this folder has a system-message.txt (indicator of a replica folder)
        const systemMessagePath = path.join(folderPath, 'system-message.txt');
        if (await fs.pathExists(systemMessagePath)) {
          const systemMessage = await fs.readFile(systemMessagePath, 'utf-8');
          
          // Check for model.txt file
          let modelName = 'claude-3-5-haiku-latest'; // default
          const modelPath = path.join(folderPath, 'model.txt');
          if (await fs.pathExists(modelPath)) {
            const modelContent = await fs.readFile(modelPath, 'utf-8');
            modelName = modelContent.trim() || modelName;
          }
          
          replicaFolders.push({
            path: folderPath,
            name: entry.name,
            modelName,
            systemMessage
          });
        }
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error scanning for replica folders: ${error}`));
  }
  
  return replicaFolders;
}

export async function simpleOrganizationSetupCommand(folderPath?: string, options: SetupOptions = {}): Promise<void> {
  const targetPath = folderPath || '.';
  const absolutePath = path.resolve(targetPath);
  
  console.log(chalk.blue('🚀 Sensay Multi-Replica Setup\n'));
  console.log(chalk.cyan(`📂 Working with folder: ${absolutePath}\n`));

  const progress = new ProgressManager();

  try {
    // Scan for replica folders
    const replicaFolders = await scanForReplicaFolders(targetPath);
    
    if (replicaFolders.length === 0) {
      console.error(chalk.red('❌ No replica folders found. Each replica folder should contain a system-message.txt file.'));
      process.exit(1);
    }
    
    console.log(chalk.blue(`📦 Found ${replicaFolders.length} replica${replicaFolders.length > 1 ? 's' : ''} to process:\n`));
    replicaFolders.forEach(folder => {
      console.log(chalk.cyan(`  - ${folder.name} (model: ${folder.modelName})`));
    });
    console.log();
    
    // Load configurations
    const { projectConfig } = await ConfigManager.getMergedConfig(targetPath);
    const effectiveConfig = await ConfigManager.getEffectiveConfig(targetPath);

    if (!effectiveConfig.apiKey) {
      console.error(chalk.red('❌ No API key found. Please run "sensay claim-key" first.'));
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      } else {
        throw new Error('No API key found');
      }
    }

    // Configure the OpenAPI client
    configureOpenAPI({ 
      ...effectiveConfig, 
      verbose: options.verbose, 
      veryVerbose: options.veryVerbose 
    });

    // Get or prompt for configuration values
    let { userName, userEmail } = options;

    if (!userName || !userEmail) {
      const currentConfig = {
        userName: userName || projectConfig.userName,
        userEmail: userEmail || projectConfig.userEmail,
      };

      if (options.nonInteractive) {
        // In non-interactive mode, use existing config or fail
        if (!currentConfig.userName || !currentConfig.userEmail) {
          console.error(chalk.red('❌ Missing required configuration. In non-interactive mode, you must either:'));
          console.error(chalk.red('   1. Provide command line options: --user-name, --user-email'));
          console.error(chalk.red('   2. Or have these values in your project config file (sensay.config.json)'));
          process.exit(1);
        }
        userName = currentConfig.userName;
        userEmail = currentConfig.userEmail;
      } else {
        const questions = [
        {
          type: 'input',
          name: 'userName',
          message: 'User name:',
          default: currentConfig.userName,
          when: !currentConfig.userName,
          validate: (input: string) => input.trim().length > 0 || 'User name is required'
        },
        {
          type: 'input',
          name: 'userEmail',
          message: 'User email:',
          default: currentConfig.userEmail,
          when: !currentConfig.userEmail,
          validate: (input: string) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(input) || 'Please enter a valid email address';
          }
        }
        ];

        const answers = await inquirer.prompt(questions);
        
        userName = userName || currentConfig.userName || answers.userName;
        userEmail = userEmail || currentConfig.userEmail || answers.userEmail;
      }
    }

    // Save project configuration (without replicaName since we have multiple)
    await ConfigManager.saveProjectConfig({
      ...projectConfig,
      userName,
      userEmail,
    }, targetPath);

    // Step 1: Create or get user
    const userSpinner = progress.createSpinner('user', 'Creating/getting user...');
    let user;
    try {
      user = await UsersService.getV1UsersMe();
      userSpinner.succeed(`User found: ${user.name || user.id}`);
    } catch (error) {
      try {
        user = await UsersService.postV1Users('2025-03-25', {
          name: userName!,
          email: userEmail!
        });
        userSpinner.succeed(`User created: ${user.name || user.id}`);
      } catch (createError: any) {
        userSpinner.fail(`Failed to create user: ${createError.message}`);
        throw createError;
      }
    }

    // Update config with user ID
    await ConfigManager.saveProjectConfig({
      ...await ConfigManager.getProjectConfig(targetPath),
      userId: user.id,
    }, targetPath);

    // First, fetch all existing replicas to check for name matches
    const existingReplicasSpinner = progress.createSpinner('fetch-replicas', 'Fetching existing replicas...');
    let existingReplicas: any[] = [];
    try {
      const replicasResponse = await ReplicasService.getV1Replicas();
      existingReplicas = replicasResponse.items || [];
      existingReplicasSpinner.succeed(`Found ${existingReplicas.length} existing replicas`);
    } catch (error) {
      existingReplicasSpinner.warn('Could not fetch existing replicas');
    }

    // Process each replica folder
    const processedReplicas: any[] = [];
    const failedReplicas: any[] = [];
    const allUploadResults: Array<{ replicaUuid: string; replicaName: string; uploadResults: any[]; totalFiles: number }> = [];
    
    for (let i = 0; i < replicaFolders.length; i++) {
      const replicaFolder = replicaFolders[i];
      console.log(chalk.blue(`\n🤖 Processing replica ${i + 1}/${replicaFolders.length}: ${replicaFolder.name}\n`));
      
      try {
        // Step 2: Check if replica already exists by name
        const replicaSpinner = progress.createSpinner(`replica-${i}`, `Checking for existing replica: ${replicaFolder.name}...`);
        
        let replica;
        const existingReplica = existingReplicas.find(r => r.name === replicaFolder.name);
        
        if (existingReplica) {
          // Replica exists, update it
          replicaSpinner.text = `Updating existing replica: ${replicaFolder.name}...`;
          
          await ReplicasService.putV1Replicas(existingReplica.uuid, '2025-03-25', {
            name: replicaFolder.name,
            shortDescription: existingReplica.shortDescription || `AI replica for ${replicaFolder.name}`,
            greeting: existingReplica.greeting || 'Hello! How can I help you today?',
            ownerID: user.id,
            slug: existingReplica.slug, // Keep the existing slug
            llm: {
              model: replicaFolder.modelName as any || 'claude-3-5-haiku-latest',
              memoryMode: 'rag-search',
              systemMessage: replicaFolder.systemMessage || 'You are a helpful AI assistant.',
              tools: []
            }
          });
          
          replica = await ReplicasService.getV1Replicas1(existingReplica.uuid);
          replicaSpinner.succeed(`Updated existing replica: ${replica.name} (model: ${replicaFolder.modelName})`);
        } else {
          // Create new replica with folder name as slug
          replicaSpinner.text = `Creating new replica: ${replicaFolder.name}...`;
          const slug = replicaFolder.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
          
          const replicaCreateResponse = await ReplicasService.postV1Replicas('2025-03-25', { 
            name: replicaFolder.name,
            shortDescription: `AI replica for ${replicaFolder.name}`,
            greeting: 'Hello! How can I help you today?',
            ownerID: user.id,
            slug: slug,
            llm: {
              model: replicaFolder.modelName as any || 'claude-3-5-haiku-latest',
              memoryMode: 'rag-search',
              systemMessage: replicaFolder.systemMessage || 'You are a helpful AI assistant.',
              tools: []
            }
          });
          
          if (replicaCreateResponse.success && replicaCreateResponse.uuid) {
            replica = await ReplicasService.getV1Replicas1(replicaCreateResponse.uuid);
            replicaSpinner.succeed(`Created new replica: ${replica.name} (model: ${replicaFolder.modelName})`);
          } else {
            throw new Error('Failed to create replica');
          }
        }

        // Step 3: Process training data for this replica
        const { files, skipped } = await FileProcessor.scanTrainingFiles(replicaFolder.path);
        let uploadResults: any[] = [];
        
        // Always clear existing training data first (even if no new files to upload)
        try {
          await FileProcessor.clearExistingTrainingData(replica.uuid, options.force, options.nonInteractive);
        } catch (error: any) {
          if (error.message.includes('Use --force to automatically delete it')) {
            // User needs to use force flag in non-interactive mode
            console.error(chalk.red('❌ ' + error.message));
            process.exit(1);
          } else {
            console.log(chalk.yellow('⚠️  Warning: Could not clear existing training data completely'));
            console.log(chalk.gray(`   ${error.message}`));
          }
        }
        
        if (files.length === 0) {
          console.log(chalk.yellow('⚠️  No training data found in training-data folder'));
          console.log(chalk.blue('ℹ️  Replica training data has been cleared and is ready for new content'));
        } else {
          FileProcessor.displayFilesSummary(files, skipped);

          // Upload training data
          const trainingSpinner = progress.createSpinner(`training-${i}`, 'Uploading training data...');
          
          try {
            uploadResults = await FileProcessor.uploadTrainingFiles(replica.uuid, files, trainingSpinner);
            const successful = uploadResults.filter(r => r.success).length;
            const failed = uploadResults.filter(r => !r.success).length;
            
            if (failed > 0) {
              trainingSpinner.succeed(`Training data upload completed: ${successful} successful, ${failed} failed`);
              console.log(chalk.yellow('\n⚠️  Failed uploads:'));
              uploadResults.filter(r => !r.success).forEach(r => {
                console.log(chalk.gray(`   - ${r.file.relativePath}: ${r.error}`));
              });
            } else {
              trainingSpinner.succeed(`Training data uploaded: ${files.length} files processed`);
            }
            
          } catch (error: any) {
            trainingSpinner.fail(`Training data upload failed: ${error.message}`);
            // Don't throw - just warn and continue
            console.log(chalk.yellow('⚠️  Some training files may not have uploaded successfully'));
          }

          // Store upload results for batch monitoring later
          if (uploadResults.length > 0 && uploadResults.some(r => r.success)) {
            allUploadResults.push({
              replicaUuid: replica.uuid,
              replicaName: replicaFolder.name,
              uploadResults,
              totalFiles: files.length
            });
          }
        }
        
        processedReplicas.push({
          name: replicaFolder.name,
          uuid: replica.uuid,
          model: replicaFolder.modelName,
          trainingFiles: files.length,
          uploadResults: uploadResults
        });
        
      } catch (error: any) {
        console.error(chalk.red(`\n❌ Failed to process replica ${replicaFolder.name}: ${error.message}`));
        failedReplicas.push({
          name: replicaFolder.name,
          error: error.message
        });
      }
    }

    // Final summary
    console.log(chalk.green('\n✅ Multi-replica setup completed!'));
    console.log(chalk.cyan(`👤 User: ${userName} (${user.id})`));
    
    if (processedReplicas.length > 0) {
      console.log(chalk.green(`\n✅ Successfully processed ${processedReplicas.length} replica${processedReplicas.length > 1 ? 's' : ''}:`));
      processedReplicas.forEach(r => {
        console.log(chalk.cyan(`  - ${r.name} (${r.uuid})`));
        console.log(chalk.gray(`    Model: ${r.model}, Training files: ${r.trainingFiles}`));
      });
    }
    
    if (failedReplicas.length > 0) {
      console.log(chalk.red(`\n❌ Failed to process ${failedReplicas.length} replica${failedReplicas.length > 1 ? 's' : ''}:`));
      failedReplicas.forEach(r => {
        console.log(chalk.red(`  - ${r.name}: ${r.error}`));
      });
    }
    
    // Monitor training status for all replicas that had successful uploads
    if (allUploadResults.length > 0) {
      console.log(chalk.blue(`\n🔄 Monitoring training progress for all ${allUploadResults.length} replica${allUploadResults.length > 1 ? 's' : ''}...`));
      
      for (const replicaData of allUploadResults) {
        console.log(chalk.cyan(`\n📊 Checking training status for ${replicaData.replicaName}...`));
        try {
          await FileProcessor.pollTrainingStatus(
            replicaData.replicaUuid, 
            replicaData.uploadResults, 
            replicaData.totalFiles
          );
        } catch (error: any) {
          console.log(chalk.yellow(`⚠️  Training status monitoring for ${replicaData.replicaName} ended with error: ${error.message}`));
        }
      }
    }

  } catch (error: any) {
    console.error(chalk.red('\n❌ Setup failed:'));
    
    if (error instanceof ApiError) {
      // Properly typed API error from generated client
      console.error(chalk.red(`Status: ${error.status}`));
      console.error(chalk.red(`Error: ${error.message}`));
      
      // Try to get additional error details from the body
      if (error.body) {
        const body = error.body as any;
        if (body.request_id) {
          console.error(chalk.gray(`Request ID: ${body.request_id}`));
        }
        if (body.fingerprint) {
          console.error(chalk.gray(`Fingerprint: ${body.fingerprint}`));
        }
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      // Network error
      console.error(chalk.red('Network error: Could not reach the API'));
      console.error(chalk.red('Please check your internet connection'));
    } else {
      // Other error
      console.error(chalk.red(`Error: ${error.message || error}`));
    }
    
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

export function setupSimpleOrganizationSetupCommand(program: Command): void {
  const cmd = program
    .command('simple-organization-setup [folder-path]')
    .description('Set up user and multiple replicas with training data from subfolders')
    .option('-u, --user-name <name>', 'user name for the account')
    .option('-e, --user-email <email>', 'user email address')
    .option('-f, --force', 'skip confirmation before deleting existing training data')
    .action((folderPath, options) => {
      const globalOptions = program.opts();
      return simpleOrganizationSetupCommand(folderPath, { 
        ...options, 
        nonInteractive: globalOptions.nonInteractive,
        verbose: globalOptions.verbose,
        veryVerbose: globalOptions.veryVerbose
      });
    });

  // Configure help in wget style for this command
  cmd.configureHelp({
    formatHelp: (cmd, helper) => {
      const termWidth = helper.padWidth(cmd, helper);
      
      let str = `Sensay CLI 1.0.1 - Multi-Replica Organization Setup
Usage: ${helper.commandUsage(cmd)}

Set up a complete organization with user account and multiple replicas. This command
creates a user and processes each subfolder as a separate replica. Each replica folder
should contain:
  - system-message.txt (required): The system prompt for the replica
  - model.txt (optional): The model name (defaults to claude-3-5-haiku-latest)
  - training-data/ (optional): Folder containing training files

Options:
`;
      
      // Add options
      cmd.options.forEach(option => {
        const flags = helper.optionTerm(option);
        const description = helper.optionDescription(option);
        str += `  ${flags.padEnd(termWidth)}${description}\n`;
      });
      
      str += `
Examples:
  sensay simple-organization-setup
  sensay simple-organization-setup ./my-organization
  sensay simple-organization-setup -u "John Doe" -e "john@company.com"
  sensay simple-organization-setup --force
  
Folder Structure Example:
  my-organization/
    ├── sales-assistant/
    │   ├── system-message.txt
    │   ├── model.txt
    │   └── training-data/
    │       ├── products.txt
    │       └── policies.pdf
    └── support-bot/
        ├── system-message.txt
        └── training-data/
            └── faqs.md`;

      return str;
    }
  });
}