import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as path from 'path';
import { SensayApiClient } from '../api/client.js';
import { ConfigManager } from '../config/manager.js';
import { FileProcessor } from '../utils/files.js';
import { ProgressManager } from '../utils/progress.js';

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
      process.exit(1);
    }

    const client = new SensayApiClient(effectiveConfig);

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
      user = await client.getCurrentUser();
      userSpinner.succeed(`User found: ${user.name}`);
    } catch (error) {
      try {
        user = await client.createUser({ name: userName!, email: userEmail });
        userSpinner.succeed(`User created: ${user.name}`);
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

    // Step 2: Create or get replica
    const replicaSpinner = progress.createSpinner('replica', 'Creating/getting replica...');
    const replicas = await client.getReplicas();
    let replica = replicas.find(r => r.name === replicaName);

    if (!replica) {
      replica = await client.createReplica({ name: replicaName! });
      replicaSpinner.succeed(`Replica created: ${replica.name}`);
    } else {
      replicaSpinner.succeed(`Replica found: ${replica.name}`);
    }

    // Update config with replica ID
    await ConfigManager.saveProjectConfig({
      ...await ConfigManager.getProjectConfig(targetPath),
      replicaId: replica.id,
    }, targetPath);

    // Step 3: Update system message
    const systemMessage = await FileProcessor.readSystemMessage(targetPath);
    if (systemMessage) {
      const systemSpinner = progress.createSpinner('system', 'Updating system message...');
      try {
        await client.updateReplicaSystemMessage(replica.id, systemMessage);
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
        await client.clearTrainingData(replica.id);
        clearSpinner.succeed('Existing training data cleared');
      } catch (error: any) {
        clearSpinner.fail(`Failed to clear training data: ${error.message}`);
      }

      // Upload new training data
      const uploadSpinner = progress.createSpinner('upload', 'Uploading training data...');
      try {
        const fileData = files.map(f => ({ name: f.relativePath, content: f.content }));
        await client.uploadTrainingData(replica.id, fileData);
        uploadSpinner.succeed(`${files.length} training files uploaded`);

        // Poll training status
        await progress.pollTrainingStatus(client, replica.id, files);

      } catch (error: any) {
        uploadSpinner.fail(`Failed to upload training data: ${error.message}`);
      }
    }

    console.log(chalk.green('\n✅ Simple organization setup completed successfully!'));
    console.log(chalk.cyan(`📋 Organization: ${organizationName}`));
    console.log(chalk.cyan(`👤 User: ${userName} (${user.id})`));
    console.log(chalk.cyan(`🤖 Replica: ${replicaName} (${replica.id})`));

  } catch (error: any) {
    console.error(chalk.red('\n❌ Setup failed:'));
    console.error(chalk.red(error.response?.data?.message || error.message));
    process.exit(1);
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