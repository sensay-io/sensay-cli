import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as path from 'path';
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
}

export async function simpleOrganizationSetupCommand(folderPath?: string, options: SetupOptions = {}): Promise<void> {
  const targetPath = folderPath || '.';
  const absolutePath = path.resolve(targetPath);

  console.log(chalk.blue('🚀 Sensay Setup\n'));
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

    // Configure the OpenAPI client
    configureOpenAPI(effectiveConfig);

    // Get or prompt for configuration values
    let { userName, userEmail, replicaName } = options;

    if (!userName || !userEmail || !replicaName) {
      const currentConfig = {
        userName: userName || projectConfig.userName,
        userEmail: userEmail || projectConfig.userEmail,
        replicaName: replicaName || projectConfig.replicaName,
      };

      if (options.nonInteractive) {
        // In non-interactive mode, use existing config or fail
        if (!currentConfig.userName || !currentConfig.userEmail || !currentConfig.replicaName) {
          console.error(chalk.red('❌ Missing required configuration. In non-interactive mode, you must either:'));
          console.error(chalk.red('   1. Provide command line options: --user-name, --user-email, --replica-name'));
          console.error(chalk.red('   2. Or have these values in your project config file (sensay.config.json)'));
          process.exit(1);
        }
        userName = currentConfig.userName;
        userEmail = currentConfig.userEmail;
        replicaName = currentConfig.replicaName;
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

        userName = userName || currentConfig.userName || answers.userName;
        userEmail = userEmail || currentConfig.userEmail || answers.userEmail;
        replicaName = replicaName || currentConfig.replicaName || answers.replicaName;
      }
    }

    // Save project configuration
    await ConfigManager.saveProjectConfig({
      ...projectConfig,
      userName,
      userEmail,
      replicaName,
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

    // Step 2: Read system message early so we can use it in replica creation
    const systemMessage = await FileProcessor.readSystemMessage(targetPath);

    // Step 3: Create or update replica
    const replicaSpinner = progress.createSpinner('replica', 'Creating/updating replica...');
    const currentProjectConfig = await ConfigManager.getProjectConfig(targetPath);
    let replica;

    if (currentProjectConfig.replicaId) {
      // Try to get existing replica by UUID
      try {
        replica = await ReplicasService.getV1Replicas1(currentProjectConfig.replicaId);

        // Update the replica with current settings to ensure all are correct
        await ReplicasService.putV1Replicas(currentProjectConfig.replicaId, '2025-03-25', {
          name: replicaName!,
          shortDescription: `AI replica for ${replicaName}`,
          greeting: 'Hello! How can I help you today?',
          ownerID: user.id,
          slug: replica.slug, // Keep existing slug
          llm: {
            model: 'claude-3-5-haiku-latest',
            memoryMode: 'rag-search',
            systemMessage: systemMessage || 'You are a helpful AI assistant.',
            tools: []
          }
        });

        replicaSpinner.succeed(`Replica updated: ${replica.name}`);
      } catch (error: any) {
        // If replica not found, clear the ID and create new one
        if (error.status === 404) {
          replica = null;
        } else {
          throw error;
        }
      }
    }

    if (!replica) {
      // Create new replica with minimal required fields and unique slug
      const uniqueSlug = `${replicaName!.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substr(2, 9)}`;
      const replicaCreateResponse = await ReplicasService.postV1Replicas('2025-03-25', {
        name: replicaName!,
        shortDescription: `AI replica for ${replicaName}`,
        greeting: 'Hello! How can I help you today?',
        ownerID: user.id,
        slug: uniqueSlug,
        llm: {
          model: 'claude-3-5-haiku-latest',
          memoryMode: 'rag-search',
          systemMessage: systemMessage || 'You are a helpful AI assistant.',
          tools: []
        }
      });

      if (replicaCreateResponse.success && replicaCreateResponse.uuid) {
        // Get the full replica details
        replica = await ReplicasService.getV1Replicas1(replicaCreateResponse.uuid);
        replicaSpinner.text = 'Updating replica settings...';

        // Update replica with PUT to ensure all settings are correct
        await ReplicasService.putV1Replicas(replicaCreateResponse.uuid, '2025-03-25', {
          name: replicaName!,
          shortDescription: `AI replica for ${replicaName}`,
          greeting: 'Hello! How can I help you today?',
          ownerID: user.id,
          slug: replica.slug, // Keep the generated slug
          llm: {
            model: 'claude-3-5-haiku-latest',
            memoryMode: 'rag-search',
            systemMessage: systemMessage || 'You are a helpful AI assistant.',
            tools: []
          }
        });

        replicaSpinner.succeed(`Replica created and configured: ${replica.name}`);
      } else {
        throw new Error('Failed to create replica');
      }
    }

    // Update config with replica ID
    await ConfigManager.saveProjectConfig({
      ...await ConfigManager.getProjectConfig(targetPath),
      replicaId: replica!.uuid,
    }, targetPath);

    // Ensure replica is not undefined
    if (!replica) {
      throw new Error('Failed to create or find replica');
    }

    // Step 4: System message status
    if (systemMessage) {
      console.log(chalk.blue('ℹ️  System message loaded and applied to replica'));
    } else {
      console.log(chalk.yellow('⚠️  No system-message.txt found - using default system message'));
    }

    // Step 5: Process training data
    const { files, skipped } = await FileProcessor.scanTrainingFiles(targetPath);

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
      const trainingSpinner = progress.createSpinner('training', 'Uploading training data...');
      let uploadResults: any[] = [];

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

      // Poll training status (separate from upload error handling)
      if (uploadResults.length > 0 && uploadResults.some(r => r.success)) {
        try {
          await FileProcessor.pollTrainingStatus(replica.uuid, uploadResults, files.length);
        } catch (error: any) {
          console.log(chalk.yellow(`⚠️  Training status monitoring ended with error: ${error.message}`));
        }
      }
    }

    console.log(chalk.green('\n✅ Setup completed successfully!'));
    console.log(chalk.cyan(`👤 User: ${userName} (${user.id})`));
    console.log(chalk.cyan(`🤖 Replica: ${replicaName} (${replica.uuid})`));

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
    .description('Set up user and replica with training data')
    .option('-u, --user-name <name>', 'user name for the account')
    .option('-e, --user-email <email>', 'user email address')
    .option('-r, --replica-name <name>', 'name for the replica/assistant')
    .option('-f, --force', 'skip confirmation before deleting existing training data')
    .action((folderPath, options) => {
      const globalOptions = program.opts();
      return simpleOrganizationSetupCommand(folderPath, { ...options, nonInteractive: globalOptions.nonInteractive });
    });

  // Configure help in wget style for this command
  cmd.configureHelp({
    formatHelp: (cmd, helper) => {
      const termWidth = helper.padWidth(cmd, helper);

      let str = `Sensay CLI 1.0.1 - Organization Setup
Usage: ${helper.commandUsage(cmd)}

Set up a complete organization with user account and replica. This command
creates a user, sets up a replica, and uploads training data from the specified
folder. If no folder is specified, uses the current directory.

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
  sensay simple-organization-setup ./my-project
  sensay simple-organization-setup -u "John Doe" -e "john@company.com" -r "Assistant"
  sensay simple-organization-setup --force`;

      return str;
    }
  });
}