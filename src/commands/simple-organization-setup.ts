import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as path from 'path';
import { SensayApiClient, SensayApiError } from '../generated/index';
import { ConfigManager } from '../config/manager';
import { FileProcessor } from '../utils/files';
import { ProgressManager } from '../utils/progress';

interface SetupOptions {
  folderPath?: string;
  organizationName?: string;
  userName?: string;
  userEmail?: string;
  replicaName?: string;
}

export async function simpleOrganizationSetupCommand(folderPath?: string, options: SetupOptions = {}): Promise<void> {
  const targetPath = folderPath || '.';
  const absolutePath = path.resolve(targetPath);
  
  console.log(chalk.blue('🚀 Simple Organization Setup\n'));
  console.log(chalk.cyan(`📂 Working with folder: ${absolutePath}\n`));

  const progress = new ProgressManager();

  try {
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

    const client = new SensayApiClient({
      apiKey: effectiveConfig.apiKey,
      organizationId: effectiveConfig.organizationId,
      userId: effectiveConfig.userId
    });

    // Get or prompt for configuration values
    let { organizationName, userName, userEmail, replicaName } = options;

    if (!organizationName || !userName || !userEmail || !replicaName) {
      const currentConfig = {
        organizationName: organizationName || projectConfig.organizationName,
        userName: userName || projectConfig.userName,
        userEmail: userEmail || projectConfig.userEmail,
        replicaName: replicaName || projectConfig.replicaName,
      };

      const questions = [
        {
          type: 'input',
          name: 'organizationName',
          message: 'Organization name:',
          default: currentConfig.organizationName,
          when: !currentConfig.organizationName,
          validate: (input: string) => input.trim().length > 0 || 'Organization name is required'
        },
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
        },
        {
          type: 'input',
          name: 'replicaName',
          message: 'Replica name:',
          default: currentConfig.replicaName,
          when: !currentConfig.replicaName,
          validate: (input: string) => input.trim().length > 0 || 'Replica name is required'
        }
      ];

      const answers = await inquirer.prompt(questions);
      
      organizationName = organizationName || currentConfig.organizationName || answers.organizationName;
      userName = userName || currentConfig.userName || answers.userName;
      userEmail = userEmail || currentConfig.userEmail || answers.userEmail;
      replicaName = replicaName || currentConfig.replicaName || answers.replicaName;
    }

    // Save project configuration
    await ConfigManager.saveProjectConfig({
      ...projectConfig,
      organizationName,
      userName,
      userEmail,
      replicaName,
    }, targetPath);

    // Step 1: Create or get user
    const userSpinner = progress.createSpinner('user', 'Creating/getting user...');
    let user;
    try {
      const userResponse = await client.getCurrentUser();
      user = userResponse.user;
      userSpinner.succeed(`User found: ${user.name}`);
    } catch (error) {
      try {
        const userResponse = await client.createUser({ name: userName!, email: userEmail });
        user = userResponse.user;
        userSpinner.succeed(`User created: ${user.name}`);
      } catch (createError: any) {
        userSpinner.fail(`Failed to create user: ${createError.message}`);
        throw createError;
      }
    }

    // Update config with user ID
    await ConfigManager.saveProjectConfig({
      ...await ConfigManager.getProjectConfig(targetPath),
      userId: user.uuid,
    }, targetPath);

    // Step 3: Read system message early so we can use it in replica creation
    const systemMessage = await FileProcessor.readSystemMessage(targetPath);

    // Step 2: Create or get replica
    const replicaSpinner = progress.createSpinner('replica', 'Creating/getting replica...');
    const replicasResponse = await client.getReplicas();
    let replica = replicasResponse.items.find(r => r.name === replicaName);

    if (!replica) {
      const createResponse = await client.createReplica({ 
        name: replicaName!,
        shortDescription: `AI replica for ${replicaName}`,
        greeting: 'Hello! How can I help you today?',
        ownerID: user.uuid,
        slug: replicaName!.toLowerCase().replace(/\s+/g, '-'),
        llm: {
          model: 'claude-3-5-haiku-latest',
          memoryMode: 'rag-search',
          systemMessage: systemMessage || 'You are a helpful AI assistant.',
          tools: []
        }
      });
      // Get the created replica details
      replica = await client.getReplica(createResponse.uuid);
      replicaSpinner.succeed(`Replica created: ${replica.name}`);
    } else {
      replicaSpinner.succeed(`Replica found: ${replica.name}`);
    }

    // Update config with replica ID
    await ConfigManager.saveProjectConfig({
      ...await ConfigManager.getProjectConfig(targetPath),
      replicaId: replica.uuid,
    }, targetPath);

    // Step 3: Update system message if needed and not already set during creation
    if (systemMessage) {
      const systemSpinner = progress.createSpinner('system', 'Updating system message...');
      try {
        await client.updateReplica(replica.uuid, {
          llm: {
            ...replica.llm,
            systemMessage: systemMessage
          }
        });
        systemSpinner.succeed('System message updated');
      } catch (error: any) {
        systemSpinner.fail(`Failed to update system message: ${error.message}`);
      }
    } else {
      console.log(chalk.yellow('⚠️  No system-message.txt found - skipping system message update'));
    }

    // Step 4: Process training data
    const { files, skipped } = await FileProcessor.scanTrainingFiles(targetPath);
    
    if (files.length === 0) {
      console.log(chalk.yellow('⚠️  No training data found in training-data folder'));
    } else {
      FileProcessor.displayFilesSummary(files, skipped);

      // Clear existing training data
      const clearSpinner = progress.createSpinner('clear', 'Clearing existing training data...');
      try {
        await client.clearTrainingData(replica.uuid);
        clearSpinner.succeed('Existing training data cleared');
      } catch (error: any) {
        clearSpinner.fail(`Failed to clear training data: ${error.message}`);
      }

      // Upload new training data
      const uploadSpinner = progress.createSpinner('upload', 'Uploading training data...');
      try {
        const fileData = files.map(f => ({ filename: f.relativePath, content: f.content }));
        await client.uploadTrainingData(replica.uuid, fileData);
        uploadSpinner.succeed(`${files.length} training files uploaded`);

        // Poll training status
        await progress.pollTrainingStatus(client, replica.uuid, files);

      } catch (error: any) {
        uploadSpinner.fail(`Failed to upload training data: ${error.message}`);
      }
    }

    console.log(chalk.green('\n✅ Simple organization setup completed successfully!'));
    console.log(chalk.cyan(`📋 Organization: ${organizationName}`));
    console.log(chalk.cyan(`👤 User: ${userName} (${user.uuid})`));
    console.log(chalk.cyan(`🤖 Replica: ${replicaName} (${replica.uuid})`));

  } catch (error: any) {
    console.error(chalk.red('\n❌ Setup failed:'));
    
    if (SensayApiClient.isSensayApiError(error)) {
      // Properly typed Sensay API error
      console.error(chalk.red(`Status: ${error.status}`));
      console.error(chalk.red(`Error: ${error.response.error}`));
      
      if (error.requestId) {
        console.error(chalk.gray(`Request ID: ${error.requestId}`));
      }
      
      if (error.fingerprint) {
        console.error(chalk.gray(`Fingerprint: ${error.fingerprint}`));
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      // Network error
      console.error(chalk.red('Network error: Could not reach the API'));
      console.error(chalk.red('Please check your internet connection'));
    } else {
      // Other error
      console.error(chalk.red(`Error: ${error.message}`));
    }
    
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

export function setupSimpleOrganizationSetupCommand(program: Command): void {
  program
    .command('simple-organization-setup [folder-path]')
    .description('Set up organization, user, and replica with training data')
    .option('-o, --organization-name <name>', 'Organization name')
    .option('-u, --user-name <name>', 'User name')
    .option('-e, --user-email <email>', 'User email')
    .option('-r, --replica-name <name>', 'Replica name')
    .action(simpleOrganizationSetupCommand);
}