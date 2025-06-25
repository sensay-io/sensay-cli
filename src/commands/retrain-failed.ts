import { Command } from 'commander';
import inquirer from 'inquirer';
import { ConfigManager } from '../config/manager';
import { OpenAPI, TrainingService, ReplicasService, KnowledgeBaseService } from '../generated/index';
import { ProgressManager } from '../utils/progress';
import chalk from 'chalk';

interface RetrainFailedOptions {
  replicaUuid?: string;
  allReplicas?: boolean;
  force?: boolean;
  apiKey?: string;
  userId?: string;
  silent?: boolean;
  save?: boolean;
}

// Status that indicates item cannot be retrained
const UNPROCESSABLE_STATUS = 'UNPROCESSABLE';

export async function retrainFailedCommand(folderPath: string, options: RetrainFailedOptions = {}) {
  const progress = new ProgressManager();
  const targetPath = folderPath || '.';

  try {
    // Load configurations following standard priority pattern
    const { projectConfig } = await ConfigManager.getMergedConfig(targetPath);
    const effectiveConfig = await ConfigManager.getEffectiveConfig(targetPath);

    if (!effectiveConfig.apiKey) {
      console.error(chalk.red('❌ No API key found. Please run "sensay claim-key" first.'));
      process.exit(1);
    }

    // Configure OpenAPI headers
    OpenAPI.HEADERS = {
      'X-API-Version': '2025-03-25',
      'X-ORGANIZATION-SECRET': effectiveConfig.apiKey,
    };

    if (effectiveConfig.userId) {
      OpenAPI.HEADERS['X-USER-ID'] = effectiveConfig.userId;
    }

    // Handle replica selection
    let replicasToProcess: Array<{ uuid: string; name: string }> = [];

    if (options.allReplicas) {
      console.log(chalk.cyan('Processing all replicas...'));
      
      const spinner = progress.createSpinner('list-replicas', 'Fetching replicas...');
      try {
        const response = await ReplicasService.getV1Replicas();
        replicasToProcess = response.items?.map(r => ({ uuid: r.uuid!, name: r.name! })) || [];
        spinner.succeed(`Found ${replicasToProcess.length} replicas`);
      } catch (error) {
        spinner.fail('Failed to fetch replicas');
        throw error;
      }
    } else {
      // Single replica selection
      let replicaUuid = options.replicaUuid;

      if (!replicaUuid && !options.silent) {
        // Interactive selection
        const spinner = progress.createSpinner('list-replicas', 'Fetching replicas...');
        try {
          const response = await ReplicasService.getV1Replicas();
          spinner.succeed();
          
          const choices = response.items?.map(r => ({
            name: r.name,
            value: r.uuid
          })) || [];

          if (choices.length === 0) {
            throw new Error('No replicas found');
          }

          const answer = await inquirer.prompt([{
            type: 'list',
            name: 'replicaUuid',
            message: 'Select replica:',
            choices,
            default: projectConfig.replicaId
          }]);

          replicaUuid = answer.replicaUuid;
        } catch (error) {
          spinner.fail('Failed to fetch replicas');
          throw error;
        }
      } else if (!replicaUuid) {
        // Non-interactive mode without replicaUuid
        replicaUuid = projectConfig.replicaId;
        if (!replicaUuid) {
          console.error(chalk.red('❌ Missing --replica-uuid parameter'));
          console.error(chalk.red('   Either provide --replica-uuid or set replicaUuid in sensay.config.json'));
          process.exit(1);
        }
      }

      // Get replica name for display
      const spinner = progress.createSpinner('get-replica', 'Fetching replica details...');
      try {
        const replica = await ReplicasService.getV1Replicas1(replicaUuid!);
        replicasToProcess = [{ uuid: replicaUuid!, name: replica.name || 'Unknown' }];
        spinner.succeed();
      } catch (error) {
        spinner.fail('Failed to fetch replica details');
        throw error;
      }
    }

    // Process each replica
    let totalFailedItems = 0;
    let totalRetrainedItems = 0;

    for (const replica of replicasToProcess) {
      console.log(chalk.blue(`\nProcessing replica: ${replica.name}`));
      
      // Fetch all training items with failed status
      const failedItems: any[] = [];
      let page = 1;
      const pageSize = 100;
      let hasMore = true;

      const spinner = progress.createSpinner(`fetch-${replica.uuid}`, 'Fetching knowledge base items...');
      
      while (hasMore) {
        try {
          const response = await KnowledgeBaseService.getV1ReplicasKnowledgeBase(
            replica.uuid,
            undefined,  // Get all statuses for now
            undefined,
            page,
            pageSize
          );
          const items = response.items || [];
          
          
          // Filter for items with errors (excluding UNPROCESSABLE ones)
          const itemsWithErrors = items.filter((item: any) => 
            item.error && item.status !== UNPROCESSABLE_STATUS
          );
          
          failedItems.push(...itemsWithErrors);
          
          hasMore = items.length === pageSize;
          page++;
        } catch (error) {
          spinner.fail('Failed to fetch knowledge base items');
          throw error;
        }
      }
      
      spinner.succeed(`Found ${failedItems.length} failed training items (excluding UNPROCESSABLE)`);
      totalFailedItems += failedItems.length;

      if (failedItems.length === 0) {
        console.log(chalk.green('No failed training items found for this replica'));
        continue;
      }

      // Show breakdown by error type and message
      const statusBreakdown: Record<string, number> = {};
      const errorMessages: Record<string, number> = {};
      
      failedItems.forEach(item => {
        statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
        if (item.error?.message) {
          const errorKey = item.error.message.substring(0, 100); // Truncate long messages
          errorMessages[errorKey] = (errorMessages[errorKey] || 0) + 1;
        }
      });

      console.log(chalk.yellow('\nStatus breakdown:'));
      Object.entries(statusBreakdown).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      if (Object.keys(errorMessages).length > 0) {
        console.log(chalk.yellow('\nError messages:'));
        Object.entries(errorMessages).forEach(([message, count]) => {
          console.log(`  ${message}${message.length >= 100 ? '...' : ''}: ${count}`);
        });
      }

      // Confirm retraining
      if (!options.force && !options.silent) {
        const confirmAnswer = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Retrain ${failedItems.length} failed items for ${replica.name}?`,
          default: true
        }]);

        if (!confirmAnswer.confirm) {
          console.log(chalk.yellow('Skipping this replica'));
          continue;
        }
      }

      // Retrain failed items
      console.log(chalk.cyan('\nRetraining failed items...'));
      const retrainSpinner = progress.createSpinner(`retrain-${replica.uuid}`, 'Retraining items...');
      
      let retrainedCount = 0;
      const errors: string[] = [];

      for (const item of failedItems) {
        try {
          // Update status to trigger retraining by patching to restart processing
          await KnowledgeBaseService.patchV1ReplicasKnowledgeBase(
            item.id || item.knowledgeBaseID,  // Handle both field names
            replica.uuid,
            {
              status: 'NEW'
            }
          );
          retrainedCount++;
        } catch (error: any) {
          errors.push(`Failed to retrain item ${item.id || item.knowledgeBaseID}: ${error.message}`);
        }
      }

      retrainSpinner.succeed(`Triggered retraining for ${retrainedCount}/${failedItems.length} items`);
      totalRetrainedItems += retrainedCount;

      if (errors.length > 0) {
        console.log(chalk.red('\nErrors encountered:'));
        errors.forEach(err => console.log(`  - ${err}`));
      }

      // Monitor training status
      console.log(chalk.cyan('\nMonitoring training status...'));
      await monitorTrainingStatus(replica.uuid, failedItems.map(i => i.id || i.knowledgeBaseID), progress);
    }

    // Summary
    console.log(chalk.green('\n✓ Retraining complete!'));
    console.log(chalk.white(`Total failed items found: ${totalFailedItems}`));
    console.log(chalk.white(`Total items retrained: ${totalRetrainedItems}`));

  } catch (error: any) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export function setupRetrainFailedCommand(program: Command) {
  program
    .command('retrain-failed')
    .alias('rf')
    .description('Retrain failed knowledge base items (with errors) for a replica or all replicas, excluding UNPROCESSABLE items')
    .option('-r, --replica-uuid <uuid>', 'UUID of the replica')
    .option('-a, --all-replicas', 'Process all replicas')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('--apikey <key>', 'API key for authentication')
    .option('--userid <id>', 'User ID')
    .option('-s, --silent', 'Skip interactive prompts')
    .option('--save', 'Save configuration options to project')
    .action(async (options: RetrainFailedOptions) => {
      await retrainFailedCommand(process.cwd(), options);
    });
}

async function monitorTrainingStatus(
  replicaUuid: string,
  itemIds: number[],
  progress: ProgressManager
): Promise<void> {
  const maxAttempts = 360; // 30 minutes (5 seconds * 360)
  let attempts = 0;
  const spinner = progress.createSpinner(`monitor-${replicaUuid}`, 'Monitoring training status...');

  while (attempts < maxAttempts) {
    try {
      // Fetch current status of all items
      const statusCounts: Record<string, number> = {};
      let completedCount = 0;
      let failedCount = 0;

      for (const id of itemIds) {
        try {
          const item = await KnowledgeBaseService.getV1KnowledgeBase(id);
          const status = item.status || 'UNKNOWN';
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          if (status === 'READY') {
            completedCount++;
          } else if (item.error && status !== UNPROCESSABLE_STATUS) {
            failedCount++;
          }
        } catch (error) {
          // Item might have been deleted or is inaccessible
          statusCounts['UNKNOWN'] = (statusCounts['UNKNOWN'] || 0) + 1;
        }
      }

      // Update spinner with current status
      const statusText = Object.entries(statusCounts)
        .map(([status, count]) => `${status}: ${count}`)
        .join(', ');
      
      spinner.text = `Monitoring training status... ${statusText}`;

      // Check if all items are done (either ready or failed again)
      if (completedCount + failedCount === itemIds.length) {
        if (failedCount > 0) {
          spinner.warn(`Training completed with ${failedCount} items still failing`);
        } else {
          spinner.succeed(`All ${completedCount} items trained successfully!`);
        }
        break;
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

    } catch (error) {
      // Continue monitoring even if there's an error
      spinner.text = `Monitoring training status... (API error, retrying)`;
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
  }

  if (attempts >= maxAttempts) {
    spinner.warn('Training monitoring timed out after 30 minutes');
  }
}