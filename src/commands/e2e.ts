import { Command } from 'commander';
import { OpenAPI, ApiError, UsersService, ReplicasService, KnowledgeBaseService, ChatCompletionsService } from '../generated/index';
import { ConfigManager } from '../config/manager';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';

interface E2EOptions {
  apiKey?: string;
  nonInteractive?: boolean;
  timeout?: string;
  kbTypes?: string;
}

interface TestResult {
  kbType: string;
  success: boolean;
  error?: string;
  duration: number;
}

const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes
const AVAILABLE_KB_TYPES = ['text', 'file', 'website', 'youtube'];

export async function e2eCommand(options: E2EOptions = {}): Promise<void> {
  try {
    // Get configuration
    const effectiveConfig = await ConfigManager.getEffectiveConfig(process.cwd());
    
    // Configure API authentication
    const apiKey = options.apiKey || effectiveConfig.apiKey;
    if (!apiKey) {
      console.error(chalk.red('❌ API key is required. Use --apikey option or configure it.'));
      process.exit(1);
    }

    OpenAPI.BASE = effectiveConfig.baseUrl || 'https://api.sensay.io';
    OpenAPI.HEADERS = {
      'X-API-Version': '2025-03-25',
      'X-ORGANIZATION-SECRET': apiKey,
    };

    // Parse timeout
    const timeoutMs = options.timeout ? parseInt(options.timeout) * 1000 : DEFAULT_TIMEOUT_MS;
    
    // Determine KB types to test
    let kbTypesToTest: string[] = [];
    
    if (options.kbTypes) {
      kbTypesToTest = options.kbTypes.split(',').map(t => t.trim());
    } else if (!options.nonInteractive) {
      // Interactive mode - ask which KB types to test
      const { selectedTypes } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedTypes',
          message: 'Select KB types to test:',
          choices: AVAILABLE_KB_TYPES,
          default: AVAILABLE_KB_TYPES,
          validate: (input) => input.length > 0 || 'Please select at least one KB type'
        }
      ]);
      kbTypesToTest = selectedTypes;
    } else {
      // Non-interactive mode - test all by default
      kbTypesToTest = AVAILABLE_KB_TYPES;
    }

    // Validate KB types
    const invalidTypes = kbTypesToTest.filter(t => !AVAILABLE_KB_TYPES.includes(t));
    if (invalidTypes.length > 0) {
      console.error(chalk.red(`❌ Invalid KB types: ${invalidTypes.join(', ')}`));
      console.error(chalk.yellow(`Available types: ${AVAILABLE_KB_TYPES.join(', ')}`));
      process.exit(1);
    }

    console.log(chalk.blue('\n🧪 Starting E2E tests...'));
    console.log(chalk.gray(`Timeout: ${timeoutMs / 1000}s`));
    console.log(chalk.gray(`KB Types: ${kbTypesToTest.join(', ')}\n`));

    // Generate unique test run ID to allow parallel execution
    const testRunId = uuidv4().substring(0, 8);
    const testEmail = `e2e-test-${testRunId}@sensay.test`;
    const testUserName = `E2E Test User ${testRunId}`;
    
    let userId: string | undefined;
    const results: TestResult[] = [];

    try {
      // Step 1: Create a new user
      console.log(chalk.cyan('📝 Creating test user...'));
      console.log(chalk.gray(`  Name: ${testUserName}`));
      console.log(chalk.gray(`  Email: ${testEmail}`));
      
      const userResponse = await UsersService.postV1Users('2025-03-25', {
        name: testUserName,
        email: testEmail
      });
      
      userId = userResponse.id;
      OpenAPI.HEADERS['X-USER-ID'] = userId;
      
      console.log(chalk.green(`✅ User created: ${userId}\n`));

      // Step 2: Run tests for each KB type
      for (const kbType of kbTypesToTest) {
        console.log(chalk.cyan(`\n📋 Testing KB type: ${kbType}`));
        const startTime = Date.now();
        
        try {
          // 2a: Create a new replica
          const replicaName = `E2E Test Replica ${kbType} ${testRunId}`;
          console.log(chalk.gray(`  Creating replica: ${replicaName}`));
          
          const replicaResponse = await ReplicasService.postV1Replicas('2025-03-25', {
            name: replicaName,
            shortDescription: `Test replica for ${kbType} KB type`,
            greeting: `Hello! I'm a test replica trained on ${kbType} content.`,
            ownerID: userId,
            slug: `e2e-test-${kbType}-${testRunId}`,
            llm: {
              model: 'claude-3-5-haiku-latest',
              memoryMode: 'rag-search',
              systemMessage: `You are a test replica created for E2E testing. You have been trained on ${kbType} content.`,
              tools: []
            }
          });
          
          const replicaUuid = replicaResponse.uuid!;
          console.log(chalk.gray(`  Replica created: ${replicaUuid}`));

          // 2b: Train the replica based on KB type
          let trainingContent: string;
          let kbId: number;
          
          switch (kbType) {
            case 'text':
              trainingContent = `This is test content for E2E testing with ID ${testRunId}. The secret phrase is: RAINBOW_UNICORN_${testRunId}`;
              console.log(chalk.gray(`  Training with text content...`));
              
              const textKbResponse = await KnowledgeBaseService.postV1ReplicasKnowledgeBase(
                replicaUuid,
                '2025-03-25',
                {
                  text: trainingContent,
                  autoRefresh: false
                }
              );
              const kbResult = textKbResponse.results[0];
              if ('error' in kbResult) {
                throw new Error(`Failed to create knowledge base: ${kbResult.error}`);
              }
              kbId = kbResult.knowledgeBaseID!;
              break;
              
            case 'website':
              // For now, skip implementation - will be added in next iteration
              console.log(chalk.yellow(`  ⚠️  Website KB type not yet implemented`));
              results.push({
                kbType,
                success: false,
                error: 'Not implemented',
                duration: Date.now() - startTime
              });
              continue;
              
            case 'youtube':
              // For now, skip implementation - will be added in next iteration
              console.log(chalk.yellow(`  ⚠️  YouTube KB type not yet implemented`));
              results.push({
                kbType,
                success: false,
                error: 'Not implemented',
                duration: Date.now() - startTime
              });
              continue;
              
            case 'file':
              // For now, skip implementation - will be added in next iteration
              console.log(chalk.yellow(`  ⚠️  File KB type not yet implemented`));
              results.push({
                kbType,
                success: false,
                error: 'Not implemented',
                duration: Date.now() - startTime
              });
              continue;
              
            default:
              throw new Error(`Unknown KB type: ${kbType}`);
          }

          // 2c: Wait for training to complete
          console.log(chalk.gray(`  Waiting for training to complete...`));
          const trainingStartTime = Date.now();
          let isTrainingComplete = false;
          
          while (Date.now() - trainingStartTime < timeoutMs) {
            // Check KB status
            const kbStatus = await KnowledgeBaseService.getV1ReplicasKnowledgeBase1(
              kbId,
              replicaUuid,
              '2025-03-25'
            );
            
            if (kbStatus.status === 'READY') {
              isTrainingComplete = true;
              console.log(chalk.gray(`  Training completed in ${Math.round((Date.now() - trainingStartTime) / 1000)}s`));
              break;
            } else if (kbStatus.status === 'UNPROCESSABLE') {
              throw new Error(`Training failed: ${kbStatus.error?.message || 'Unknown error'}`);
            }
            
            // Wait 5 seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          
          if (!isTrainingComplete) {
            throw new Error(`Training timeout after ${timeoutMs / 1000}s`);
          }

          // 2d: Chat with replica and verify response
          console.log(chalk.gray(`  Testing chat with trained content...`));
          const testMessage = `What is the secret phrase you were trained on?`;
          
          const chatResponse = await ChatCompletionsService.postV1ReplicasChatCompletions(
            replicaUuid,
            '2025-03-25',
            {
              content: testMessage,
              source: 'web'
            }
          );
          
          const responseContent = chatResponse.content || '';
          const expectedPhrase = `RAINBOW_UNICORN_${testRunId}`;
          
          if (responseContent.includes(expectedPhrase)) {
            console.log(chalk.green(`  ✅ Chat verification passed - found expected phrase`));
            results.push({
              kbType,
              success: true,
              duration: Date.now() - startTime
            });
          } else {
            console.log(chalk.red(`  ❌ Chat verification failed`));
            console.log(chalk.gray(`     Expected phrase: ${expectedPhrase}`));
            console.log(chalk.gray(`     Response: ${responseContent.substring(0, 100)}...`));
            results.push({
              kbType,
              success: false,
              error: 'Chat verification failed - expected phrase not found',
              duration: Date.now() - startTime
            });
          }
          
        } catch (error: any) {
          console.log(chalk.red(`  ❌ Test failed: ${error.message}`));
          results.push({
            kbType,
            success: false,
            error: error.message,
            duration: Date.now() - startTime
          });
        }
      }

    } finally {
      // Step 4: Delete the user (cascade deletes all resources)
      if (userId) {
        console.log(chalk.cyan('\n🧹 Cleaning up test resources...'));
        try {
          // Note: Can only delete current user with deleteV1UsersMe
          // Since we're using organization secret, we cannot delete a specific user by ID
          console.log(chalk.yellow('⚠️  Manual cleanup required for user: ' + userId));
          // Removed success message since we can't delete the user programmatically
        } catch (error: any) {
          console.log(chalk.red(`❌ Failed to delete test user: ${error.message}\n`));
        }
      }
    }

    // Step 3: Provide summary
    console.log(chalk.blue('📊 E2E Test Summary'));
    console.log(chalk.blue('=================='));
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(chalk.gray(`Total tests: ${results.length}`));
    console.log(chalk.green(`✅ Passed: ${successCount}`));
    console.log(chalk.red(`❌ Failed: ${failureCount}`));
    console.log('');
    
    // Detailed results
    for (const result of results) {
      const status = result.success ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
      const duration = `${(result.duration / 1000).toFixed(1)}s`;
      console.log(`${status} ${result.kbType.padEnd(10)} (${duration})${result.error ? ` - ${result.error}` : ''}`);
    }
    
    // Exit with appropriate code
    process.exit(failureCount > 0 ? 1 : 0);
    
  } catch (error: any) {
    if (error instanceof ApiError) {
      console.error(chalk.red(`\n❌ API Error: ${error.message}`));
      if (error.status) {
        console.error(chalk.red(`Status: ${error.status}`));
      }
      if (error.body) {
        const body = error.body as any;
        if (body.request_id) {
          console.error(chalk.red(`Request ID: ${body.request_id}`));
        }
      }
    } else {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
    }
    process.exit(1);
  }
}

export function setupE2ECommand(program: Command): void {
  const cmd = program
    .command('e2e')
    .alias('e')
    .description('Run end-to-end tests for Sensay API operations')
    .option('--timeout <seconds>', 'timeout for each test in seconds', '300')
    .option('--kb-types <types>', 'comma-separated list of KB types to test (text,file,website,youtube)')
    .action((options) => {
      const globalOptions = program.opts();
      return e2eCommand({ ...options, ...globalOptions });
    });
}