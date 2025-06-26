import { Command } from 'commander';
import { ApiError, UsersService, ReplicasService, KnowledgeBaseService, ChatCompletionsService, TrainingService } from '../generated/index';
import { ConfigManager } from '../config/manager';
import { configureOpenAPI } from '../utils/openapi-config';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs-extra';
import * as path from 'path';
import fetch from 'node-fetch';

interface E2EOptions {
  apiKey?: string;
  nonInteractive?: boolean;
  timeout?: string;
  kbTypes?: string;
  skipChatVerification?: boolean;
  parallel?: boolean;
}

interface TestResult {
  kbType: string;
  success: boolean;
  error?: string;
  duration: number;
}

const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes
const AVAILABLE_KB_TYPES = ['text', 'file', 'website', 'youtube'];

async function runKBTypeTest(
  kbType: string, 
  userId: string, 
  testRunId: string, 
  timeoutMs: number,
  skipChatVerification: boolean
): Promise<TestResult> {
  const startTime = Date.now();
  console.log(chalk.cyan(`\n📋 Testing KB type: ${kbType} (started at ${new Date().toISOString()})`));
  
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
        // Use a simple test website that always returns consistent content
        // Encode the test content with the actual testRunId
        const websiteContent = `This is test content for E2E testing with ID ${testRunId}. The secret phrase is: RAINBOW_UNICORN_${testRunId}`;
        const base64Content = Buffer.from(websiteContent).toString('base64');
        const testUrl = `https://httpbin.org/base64/${base64Content}`;
        console.log(chalk.gray(`  Training with website URL (httpbin.org test)...`));
        
        const websiteKbResponse = await KnowledgeBaseService.postV1ReplicasKnowledgeBase(
          replicaUuid,
          '2025-03-25',
          {
            url: testUrl,
            autoRefresh: false
          }
        );
        const websiteResult = websiteKbResponse.results[0];
        if ('error' in websiteResult) {
          throw new Error(`Failed to create website knowledge base: ${websiteResult.error}`);
        }
        kbId = websiteResult.knowledgeBaseID!;
        break;
        
      case 'youtube':
        // Use a short, stable YouTube video for testing
        // This is a 30-second test pattern video that should remain available
        const youtubeUrl = 'https://www.youtube.com/watch?v=2vjPBrBU-TM';
        console.log(chalk.gray(`  Training with YouTube URL: ${youtubeUrl}`));
        
        const youtubeKbResponse = await KnowledgeBaseService.postV1ReplicasKnowledgeBase(
          replicaUuid,
          '2025-03-25',
          {
            url: youtubeUrl,
            autoRefresh: false
          }
        );
        const youtubeResult = youtubeKbResponse.results[0];
        if ('error' in youtubeResult) {
          throw new Error(`Failed to create YouTube knowledge base: ${youtubeResult.error}`);
        }
        kbId = youtubeResult.knowledgeBaseID!;
        break;
        
      case 'file':
        // Create a temporary test file
        const tempDir = path.join(process.cwd(), '.e2e-temp');
        await fs.ensureDir(tempDir);
        const testFileName = `test-${testRunId}.txt`;
        const testFilePath = path.join(tempDir, testFileName);
        const fileContent = `This is test content for E2E testing with ID ${testRunId}. The secret phrase is: RAINBOW_UNICORN_${testRunId}`;
        
        await fs.writeFile(testFilePath, fileContent);
        console.log(chalk.gray(`  Training with file: ${testFileName}`));
        
        try {
          // Get signed URL for file upload
          const signedUrlResponse = await TrainingService.getV1ReplicasTrainingFilesUpload(
            replicaUuid,
            testFileName
          );
          
          if (!signedUrlResponse.signedURL) {
            throw new Error('Failed to get signed URL for file upload');
          }
          
          console.log(chalk.gray(`  Uploading file to cloud storage...`));
          
          // Upload file to signed URL
          const fileBuffer = await fs.readFile(testFilePath);
          const uploadResponse = await fetch(signedUrlResponse.signedURL, {
            method: 'PUT',
            body: fileBuffer,
            headers: {
              'Content-Type': 'text/plain'
            }
          });
          
          if (!uploadResponse.ok) {
            throw new Error(`File upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
          }
          
          // Create knowledge base entry for the uploaded file
          const fileKbResponse = await KnowledgeBaseService.postV1ReplicasKnowledgeBase(
            replicaUuid,
            '2025-03-25',
            {
              filename: testFileName,
              autoRefresh: false
            }
          );
          
          const fileResult = fileKbResponse.results[0];
          if ('error' in fileResult) {
            throw new Error(`Failed to create file knowledge base: ${fileResult.error}`);
          }
          kbId = fileResult.knowledgeBaseID!;
          
          // Clean up temp file
          await fs.remove(testFilePath);
          
        } catch (error) {
          // Clean up on error
          await fs.remove(testFilePath).catch(() => {});
          throw error;
        }
        break;
        
      default:
        throw new Error(`Unknown KB type: ${kbType}`);
    }

    // 2c: Wait for training to complete
    console.log(chalk.gray(`  Waiting for training to complete (KB ID: ${kbId})...`));
    const trainingStartTime = Date.now();
    let isTrainingComplete = false;
    let previousStatus: string | undefined;
    let pollCount = 0;
    
    while (Date.now() - trainingStartTime < timeoutMs) {
      pollCount++;
      
      // Check KB status
      const kbStatus = await KnowledgeBaseService.getV1ReplicasKnowledgeBase1(
        kbId,
        replicaUuid,
        '2025-03-25'
      );
      
      // Log status change
      if (kbStatus.status !== previousStatus) {
        const elapsed = Math.round((Date.now() - trainingStartTime) / 1000);
        console.log(chalk.gray(`  [${kbType}] [${elapsed}s] Status: ${previousStatus || 'INITIAL'} → ${kbStatus.status}`));
        previousStatus = kbStatus.status;
        
        // Log additional details for certain statuses
        if (kbStatus.status === 'FILE_UPLOADED') {
          console.log(chalk.gray(`    File upload confirmed`));
        } else if (kbStatus.status === 'RAW_TEXT') {
          console.log(chalk.gray(`    Text content received`));
        } else if (kbStatus.status === 'PROCESSED_TEXT') {
          console.log(chalk.gray(`    Text processing completed`));
        } else if (kbStatus.status === 'VECTOR_CREATED') {
          console.log(chalk.gray(`    Vector embeddings created`));
        }
      } else if (pollCount % 3 === 0) {
        // Every 15 seconds (3 polls), show we're still waiting
        const elapsed = Math.round((Date.now() - trainingStartTime) / 1000);
        console.log(chalk.gray(`  [${kbType}] [${elapsed}s] Still waiting... (current status: ${kbStatus.status})`));
      }
      
      if (kbStatus.status === 'READY') {
        isTrainingComplete = true;
        const totalTime = Math.round((Date.now() - trainingStartTime) / 1000);
        console.log(chalk.green(`  ✅ Training completed successfully in ${totalTime}s`));
        break;
      } else if (kbStatus.status === 'UNPROCESSABLE') {
        const errorMsg = kbStatus.error?.message || 'Unknown error';
        console.log(chalk.red(`  ❌ Training failed with status UNPROCESSABLE: ${errorMsg}`));
        throw new Error(`Training failed: ${errorMsg}`);
      }
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    if (!isTrainingComplete) {
      throw new Error(`Training timeout after ${timeoutMs / 1000}s`);
    }

    // Skip chat verification if requested
    if (skipChatVerification) {
      console.log(chalk.gray(`  Skipping chat verification as requested`));
      return {
        kbType,
        success: true,
        duration: Date.now() - startTime
      };
    }

    // 2d: Chat with replica and verify response
    console.log(chalk.gray(`  Testing chat with trained content...`));
    
    let testMessage: string;
    let verificationPassed = false;
    
    switch (kbType) {
      case 'text':
      case 'file':
        testMessage = `What is the secret phrase you were trained on?`;
        break;
      case 'website':
        testMessage = `What content did you learn from the website I provided?`;
        break;
      case 'youtube':
        testMessage = `What did you learn from the YouTube video?`;
        break;
      default:
        testMessage = `What information have you been trained on?`;
    }
    
    const chatResponse = await ChatCompletionsService.postV1ReplicasChatCompletions(
      replicaUuid,
      '2025-03-25',
      {
        content: testMessage,
        source: 'web'
      }
    );
    
    const responseContent = chatResponse.content || '';
    
    // For text and file, we expect the exact phrase
    if (kbType === 'text' || kbType === 'file') {
      const expectedPhrase = `RAINBOW_UNICORN_${testRunId}`;
      verificationPassed = responseContent.includes(expectedPhrase);
      
      if (!verificationPassed) {
        console.log(chalk.red(`  ❌ Chat verification failed`));
        console.log(chalk.gray(`     Expected phrase: ${expectedPhrase}`));
        console.log(chalk.gray(`     Response: ${responseContent.substring(0, 100)}...`));
      }
    } else {
      // For website and youtube, just check if there's a reasonable response
      // since we can't predict exact content
      verificationPassed = responseContent.length > 20 && 
                         !responseContent.toLowerCase().includes('i don\'t have') &&
                         !responseContent.toLowerCase().includes('no information');
      
      if (!verificationPassed) {
        console.log(chalk.red(`  ❌ Chat verification failed - no meaningful response`));
        console.log(chalk.gray(`     Response: ${responseContent.substring(0, 100)}...`));
      }
    }
    
    if (verificationPassed) {
      console.log(chalk.green(`  ✅ Chat verification passed`));
      return {
        kbType,
        success: true,
        duration: Date.now() - startTime
      };
    } else {
      return {
        kbType,
        success: false,
        error: 'Chat verification failed',
        duration: Date.now() - startTime
      };
    }
    
  } catch (error: any) {
    console.log(chalk.red(`  ❌ Test failed: ${error.message}`));
    throw error;
  }
}

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

    // Configure OpenAPI client
    configureOpenAPI({ ...effectiveConfig, apiKey });

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
    
    let userId: string = '';
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
      
      if (!userId) {
        throw new Error('Failed to create user - no ID returned');
      }
      
      // Update OpenAPI headers with user ID
      configureOpenAPI({ ...effectiveConfig, apiKey, userId });
      
      console.log(chalk.green(`✅ User created: ${userId}\n`));

      // Step 2: Run tests for each KB type
      if (options.parallel) {
        console.log(chalk.cyan('\n🚀 Running tests in parallel mode...'));
        console.log(chalk.gray(`  Starting ${kbTypesToTest.length} tests simultaneously at ${new Date().toISOString()}`));
        
        // Create all test tasks - they start executing immediately
        const testTasks = kbTypesToTest.map(kbType => 
          runKBTypeTest(kbType, userId, testRunId, timeoutMs, options.skipChatVerification || false)
        );
        
        // Wait for all tests to complete
        const parallelResults = await Promise.allSettled(testTasks);
        console.log(chalk.gray(`  All tests completed at ${new Date().toISOString()}`));
        
        // Process results
        parallelResults.forEach((result, index) => {
          const kbType = kbTypesToTest[index];
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.log(chalk.red(`\n❌ Test failed for ${kbType}: ${result.reason}`));
            results.push({
              kbType,
              success: false,
              error: result.reason?.message || result.reason,
              duration: 0
            });
          }
        });
      } else {
        // Sequential mode
        for (const kbType of kbTypesToTest) {
          try {
            const result = await runKBTypeTest(kbType, userId, testRunId, timeoutMs, options.skipChatVerification || false);
            results.push(result);
          } catch (error: any) {
            results.push({
              kbType,
              success: false,
              error: error.message,
              duration: 0
            });
          }
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
      
      // Clean up temp directory
      const tempDir = path.join(process.cwd(), '.e2e-temp');
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir).catch(() => {});
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
    .option('--parallel', 'run KB type tests in parallel')
    .option('--skip-chat-verification', 'skip chat verification after training')
    .action((options) => {
      const globalOptions = program.opts();
      return e2eCommand({ ...options, ...globalOptions });
    });
}