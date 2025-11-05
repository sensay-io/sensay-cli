import { Command } from 'commander';
import { ApiError, UsersService, ReplicasService, KnowledgeBaseService, ChatCompletionsService } from '../generated/index';
import { ConfigManager } from '../config/manager';
import { configureOpenAPI } from '../utils/openapi-config';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs-extra';
import * as path from 'path';
import fetch from 'node-fetch';
import * as Sentry from '@sentry/node';

interface E2EOptions {
  apikey?: string;
  nonInteractive?: boolean;
  timeout?: string;
  kbTypes?: string;
  skipChatVerification?: boolean;
  parallel?: boolean;
  verbose?: boolean;
  veryVerbose?: boolean;
  sentryDsn?: string;
  sentryEnvironment?: string;
  preCleanup?: boolean;
  sentrySendErrors?: boolean;
  sentrySendPerformanceMetrics?: boolean;
  simulateFailure?: boolean;
  kbFiles?: string;
  kbContentTypes?: string;
}

interface KBTestScenario {
  name: string;
  url?: string;
  content?: string;
  expectedOutcome: 'success' | 'unprocessable';
  expectedError?: string;
  verificationContent?: string;
  description?: string;
  filePath?: string;
  contentType?: string;
}

interface TestResult {
  kbType: string;
  scenarioName: string;
  success: boolean;
  error?: string;
  duration: number;
}

const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes
const AVAILABLE_KB_TYPES = ['text', 'file', 'website', 'youtube'];

function inferContentTypeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.aac': return 'audio/aac';
    case '.avi': return 'video/x-msvideo';
    case '.bmp': return 'image/bmp';
    case '.css': return 'text/css';
    case '.csv': return 'text/csv';
    case '.doc': return 'application/msword';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.dta': return 'application/x-stata-data';
    case '.epub': return 'application/epub+zip';
    case '.flac': return 'audio/flac';
    case '.heic': return 'image/heic';
    case '.heif': return 'image/heif';
    case '.htm': return 'text/html';
    case '.html': return 'text/html';
    case '.jpg': return 'image/jpeg';
    case '.jpeg': return 'image/jpeg';
    case '.js': return 'text/javascript';
    case '.json': return 'application/json';
    case '.md': return 'text/markdown';
    case '.mkv': return 'video/x-matroska';
    case '.mov': return 'video/quicktime';
    case '.mp3': return 'audio/mpeg';
    case '.mp4': return 'video/mp4';
    case '.mpeg': return 'video/mpeg';
    case '.ods': return 'application/vnd.oasis.opendocument.spreadsheet';
    case '.ogg': return 'audio/ogg';
    case '.pdf': return 'application/pdf';
    case '.pdfa': return 'application/pdf';
    case '.png': return 'image/png';
    case '.ppt': return 'application/vnd.ms-powerpoint';
    case '.pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.rtf': return 'application/rtf';
    case '.sas7bdat': return 'application/x-sas-data';
    case '.tiff': return 'image/tiff';
    case '.tsv': return 'text/tab-separated-values';
    case '.txt': return 'text/plain';
    case '.wav': return 'audio/wav';
    case '.webm': return 'video/webm';
    case '.webp': return 'image/webp';
    case '.xls': return 'application/vnd.ms-excel';
    case '.xlsb': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.xlsm': return 'application/vnd.ms-excel.sheet.macroEnabled.12';
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.xml': return 'application/xml';
    case '.xpt': return 'application/x-passthrough';
    case '.yaml': return 'text/yaml';
    case '.yml': return 'text/yaml';
    default: return 'application/octet-stream';
  }
}

// Helper function to format API error details
function formatApiError(error: any, prefix: string = ''): string {
  let errorMsg = error.message || 'Unknown error';

  if (error instanceof ApiError) {
    const details: string[] = [errorMsg];

    if (error.status) {
      details.push(`Status: ${error.status}`);
    }

    if (error.body) {
      const body = error.body as any;
      if (body.message && body.message !== errorMsg) {
        details.push(`Message: ${body.message}`);
      }
      if (body.request_id) {
        details.push(`Request ID: ${body.request_id}`);
      }
      if (body.fingerprint) {
        details.push(`Fingerprint: ${body.fingerprint}`);
      }
      if (body.error) {
        details.push(`Error: ${body.error}`);
      }
      // Include any other fields that might be in the error body
      const otherFields = Object.keys(body).filter(key =>
        !['message', 'request_id', 'fingerprint', 'error'].includes(key)
      );
      for (const field of otherFields) {
        if (body[field] !== null && body[field] !== undefined) {
          details.push(`${field}: ${JSON.stringify(body[field])}`);
        }
      }
    }

    errorMsg = details.join(' | ');
  }

  return prefix ? `${prefix}: ${errorMsg}` : errorMsg;
}

// Test scenarios for each KB type
const KB_TEST_SCENARIOS: Record<string, KBTestScenario[]> = {
  text: [
    {
      name: 'standard',
      expectedOutcome: 'success',
      description: 'Standard text training'
    }
  ],
  file: [
    {
      name: 'standard',
      expectedOutcome: 'success',
      description: 'Standard file upload'
    }
  ],
  website: [
    {
      name: 'standard',
      url: 'httpbin.org',
      expectedOutcome: 'success',
      description: 'Standard website training'
    }
  ],
  youtube: [
    {
      name: 'with_cc',
      url: 'https://youtu.be/P9UPOym_tLQ',
      expectedOutcome: 'success',
      description: 'YouTube video with closed captions (should succeed)'
    }
  ]
};

async function runKBTypeTest(
  kbType: string,
  scenario: KBTestScenario,
  userId: string,
  testRunId: string,
  timeoutMs: number,
  skipChatVerification: boolean,
  sentryConfig: { dsn?: string; environment?: string; sendErrors: boolean; sendPerformanceMetrics: boolean } = { sendErrors: false, sendPerformanceMetrics: false },
  simulateFailure: boolean = false
): Promise<TestResult> {
  const startTime = Date.now();
  let trainingStartTime = 0;
  let lastStatusChangeTime = startTime;
  console.log(chalk.cyan(`\n[${kbType}/${scenario.name}] 📋 Testing KB type (started at ${new Date().toISOString()})`));
  if (scenario.description) {
    console.log(chalk.gray(`[${kbType}/${scenario.name}] ${scenario.description}`));
  }

  try {
    // 2a: Create a new replica

    const replicaName = `E2E ${kbType}/${scenario.name} ${testRunId}`;
    console.log(chalk.gray(`[${kbType}/${scenario.name}] Creating replica: ${replicaName}`));

    const replicaResponse = await ReplicasService.postV1Replicas('2025-03-25', undefined, {
      name: replicaName,
      shortDescription: `Test replica for ${kbType} KB type`,
      greeting: `Hello! I'm a test replica trained on ${kbType} content.`,
      ownerID: userId,
      slug: `e2e-test-${kbType}-${scenario.name}-${testRunId}`,
      llm: {
        model: 'claude-haiku-4-5',
        memoryMode: 'rag-search',
        systemMessage: `You are a test replica created for E2E testing. You have been trained on ${kbType} content.`,
        tools: []
      }
    });

    const replicaUuid = replicaResponse.uuid!;
    console.log(chalk.gray(`[${kbType}/${scenario.name}] Replica created: ${replicaUuid}`));

    // Simulate failure if requested
    if (simulateFailure) {
      console.log(chalk.yellow(`[${kbType}/${scenario.name}] 🧪 Simulating failure for Sentry testing...`));

      // Send error event to test Sentry integration
      if (sentryConfig.dsn && sentryConfig.sendErrors) {
        Sentry.captureMessage('E2E Training Simulated Failure', {
          level: 'error',
          tags: {
            kb_type: kbType,
            scenario: scenario.name,
            success: 'false',
            failure_reason: 'simulated'
          },
          extra: {
            simulated_failure: true,
            test_run_id: testRunId,
            replica_uuid: replicaUuid,
            timeout_ms: timeoutMs,
            kb_type: kbType,
            scenario: scenario.name
          }
        });
      }

      throw new Error(`Simulated failure for testing Sentry integration`);
    }

    // 2b: Train the replica based on KB type
    let trainingContent: string;
    let kbId: number;

    switch (kbType) {
      case 'text':
        trainingContent = `This is test content for E2E testing with ID ${testRunId}. The secret phrase is: RAINBOW_UNICORN_${testRunId}`;
        console.log(chalk.gray(`[${kbType}/${scenario.name}] Training with text content...`));

        const textKbResponse = await KnowledgeBaseService.postV1ReplicasKnowledgeBase(
          replicaUuid,
          '2025-03-25',
          undefined,
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
        console.log(chalk.gray(`[${kbType}/${scenario.name}] Training with website URL (httpbin.org test)...`));

        const websiteKbResponse = await KnowledgeBaseService.postV1ReplicasKnowledgeBase(
          replicaUuid,
          '2025-03-25',
          undefined,
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
        const youtubeUrl = scenario.url!;
        console.log(chalk.gray(`[${kbType}/${scenario.name}] Training with YouTube URL: ${youtubeUrl}`));

        const youtubeKbResponse = await KnowledgeBaseService.postV1ReplicasKnowledgeBase(
          replicaUuid,
          '2025-03-25',
          undefined,
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
        if (scenario.filePath) {
          const sourceFilePath = path.isAbsolute(scenario.filePath) ? scenario.filePath : path.resolve(process.cwd(), scenario.filePath);
          const providedFileName = path.basename(sourceFilePath);
          console.log(chalk.gray(`[${kbType}/${scenario.name}] Training with file: ${providedFileName}`));

          // Create knowledge base entry for file upload
          const fileKbResponse = await KnowledgeBaseService.postV1ReplicasKnowledgeBase(
            replicaUuid,
            '2025-03-25',
            undefined,
            {
              filename: providedFileName,
              autoRefresh: false
            }
          );

          const fileResult = fileKbResponse.results[0];
          if ('error' in fileResult) {
            throw new Error(`Failed to create file knowledge base: ${fileResult.error}`);
          }

          if (!fileResult.signedURL) {
            throw new Error('Failed to get signed URL for file upload');
          }

          console.log(chalk.gray(`[${kbType}/${scenario.name}] Uploading file to cloud storage...`));

          // Upload file to signed URL
          const fileBuffer = await fs.readFile(sourceFilePath);
          const contentType = scenario.contentType || inferContentTypeFromFilename(providedFileName);
          const uploadResponse = await fetch(fileResult.signedURL, {
            method: 'PUT',
            body: fileBuffer,
            headers: {
              'Content-Type': contentType
            }
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text().catch(() => '');
            throw new Error(`File upload failed: ${uploadResponse.status} ${uploadResponse.statusText}${errorText ? ` - ${errorText}` : ''}`);
          }

          kbId = fileResult.knowledgeBaseID!;
        } else {
          // Fallback to legacy behavior: create a temporary text file
          const tempDir = path.join(process.cwd(), '.e2e-temp');
          await fs.ensureDir(tempDir);
          const testFileName = `test-${testRunId}.txt`;
          const testFilePath = path.join(tempDir, testFileName);
          const fileContent = `This is test content for E2E testing with ID ${testRunId}. The secret phrase is: RAINBOW_UNICORN_${testRunId}`;

          await fs.writeFile(testFilePath, fileContent);
          console.log(chalk.gray(`[${kbType}/${scenario.name}] Training with file: ${testFileName}`));

          try {
            // Create knowledge base entry for file upload
            const fileKbResponse = await KnowledgeBaseService.postV1ReplicasKnowledgeBase(
              replicaUuid,
              '2025-03-25',
              undefined,
              {
                filename: testFileName,
                autoRefresh: false
              }
            );

            const fileResult = fileKbResponse.results[0];
            if ('error' in fileResult) {
              throw new Error(`Failed to create file knowledge base: ${fileResult.error}`);
            }

            if (!fileResult.signedURL) {
              throw new Error('Failed to get signed URL for file upload');
            }

            console.log(chalk.gray(`[${kbType}/${scenario.name}] Uploading file to cloud storage...`));

            // Upload file to signed URL
            const fileBuffer = await fs.readFile(testFilePath);
            const uploadResponse = await fetch(fileResult.signedURL, {
              method: 'PUT',
              body: fileBuffer,
              headers: {
                'Content-Type': 'text/plain'
              }
            });

            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text().catch(() => '');
              throw new Error(`File upload failed: ${uploadResponse.status} ${uploadResponse.statusText}${errorText ? ` - ${errorText}` : ''}`);
            }

            kbId = fileResult.knowledgeBaseID!;

            // Clean up temp file
            await fs.remove(testFilePath);

          } catch (error) {
            // Clean up on error
            await fs.remove(testFilePath).catch(() => { });
            throw error;
          }
        }
        break;

      default:
        throw new Error(`Unknown KB type: ${kbType}`);
    }

    // 2c: Wait for training to complete
    console.log(chalk.gray(`[${kbType}/${scenario.name}] [KB:${kbId}] Waiting for training to complete...`));
    trainingStartTime = Date.now();
    lastStatusChangeTime = trainingStartTime;
    let isTrainingComplete = false;
    let previousStatus: string | undefined;
    let pollCount = 0;

    // Wrap only the training monitoring in performance span
    if (sentryConfig.dsn && sentryConfig.sendPerformanceMetrics) {
      await Sentry.startSpan({
        name: `E2E Training: ${kbType}/${scenario.name}`,
        op: 'e2e_training',
        attributes: {
          kb_type: kbType,
          scenario: scenario.name,
          test_run_id: testRunId,
          kb_id: kbId
        }
      }, async () => {
        await monitorTrainingProgress();
      });
    } else {
      await monitorTrainingProgress();
    }

    async function monitorTrainingProgress() {

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
          const currentTime = Date.now();
          const elapsed = Math.round((currentTime - trainingStartTime) / 1000);
          const stepDuration = currentTime - lastStatusChangeTime;

          console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] [${elapsed}s] Status: ${previousStatus || 'INITIAL'} → ${kbStatus.status}`));

          // Track status changes for potential error reporting
          // (No Sentry event sent here - only on final failure)

          previousStatus = kbStatus.status;
          lastStatusChangeTime = currentTime;

          // Log additional details for certain statuses
          if (kbStatus.status === 'FILE_UPLOADED') {
            console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] File upload confirmed`));
          } else if (kbStatus.status === 'RAW_TEXT') {
            console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Text content received`));
          } else if (kbStatus.status === 'PROCESSED_TEXT') {
            console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Text processing completed`));
          } else if (kbStatus.status === 'VECTOR_CREATED') {
            console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Vector embeddings created`));
          } else if ((kbStatus.status as string) === 'SYNC_ERROR') {
            console.log(chalk.red(`  [${kbType}/${scenario.name}] [KB:${kbId}] Sync error detected`));
          }
        } else if (pollCount % 3 === 0) {
          // Every 15 seconds (3 polls), show we're still waiting
          const elapsed = Math.round((Date.now() - trainingStartTime) / 1000);
          console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] [${elapsed}s] Still waiting... (current status: ${kbStatus.status})`));
        }

        if (kbStatus.status === 'VECTOR_CREATED' || kbStatus.status === 'READY') {
          isTrainingComplete = true;
          const currentTime = Date.now();
          const trainingDuration = currentTime - trainingStartTime;
          const totalTime = Math.round(trainingDuration / 1000);

          if (scenario.expectedOutcome === 'unprocessable') {
            // This is unexpected - we expected it to fail
            console.log(chalk.red(`  [${kbType}/${scenario.name}] [KB:${kbId}] ❌ Training succeeded but was expected to fail`));
            throw new Error(`Expected training to fail but it succeeded`);
          }

          console.log(chalk.green(`  [${kbType}/${scenario.name}] [KB:${kbId}] ✅ Training completed successfully (${kbStatus.status}) in ${totalTime}s`));

          break;
        } else if (kbStatus.status === 'UNPROCESSABLE') {
          const errorMsg = kbStatus.error?.message || 'Unknown error';
          const currentTime = Date.now();
          const trainingDuration = currentTime - trainingStartTime;

          if (scenario.expectedOutcome === 'unprocessable') {
            // This is expected - check if the error matches
            if (scenario.expectedError && !errorMsg.toLowerCase().includes(scenario.expectedError.toLowerCase())) {
              console.log(chalk.red(`  [${kbType}/${scenario.name}] [KB:${kbId}] ❌ Training failed as expected but with wrong error`));
              console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Expected error to contain: ${scenario.expectedError}`));
              console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Actual error: ${errorMsg}`));
              throw new Error(`Expected error containing "${scenario.expectedError}" but got: ${errorMsg}`);
            }

            console.log(chalk.green(`  [${kbType}/${scenario.name}] [KB:${kbId}] ✅ Training failed as expected with status UNPROCESSABLE: ${errorMsg}`));
            isTrainingComplete = true;

            break;
          }

          // Unexpected failure
          console.log(chalk.red(`  [${kbType}/${scenario.name}] [KB:${kbId}] ❌ Training failed with status UNPROCESSABLE: ${errorMsg}`));

          // Send Sentry event for failed training
          if (sentryConfig.dsn && sentryConfig.sendErrors) {
            Sentry.captureMessage('E2E Training Failed', {
              level: 'error',
              tags: {
                kb_type: kbType,
                scenario: scenario.name,
                success: 'false',
                failure_reason: 'unprocessable'
              },
              extra: {
                training_duration_ms: trainingDuration,
                training_duration_seconds: Math.round(trainingDuration / 1000),
                error_message: errorMsg,
                kb_id: kbId,
                test_run_id: testRunId,
                timeout_ms: timeoutMs
              }
            });
          }

          throw new Error(`Training failed: ${errorMsg}`);
        } else if ((kbStatus.status as string) === 'SYNC_ERROR') {
          const errorMsg = kbStatus.error?.message || 'Unknown sync error';
          const currentTime = Date.now();
          const trainingDuration = currentTime - trainingStartTime;

          // SYNC_ERROR is always an unexpected failure
          console.log(chalk.red(`  [${kbType}/${scenario.name}] [KB:${kbId}] ❌ Training failed with status SYNC_ERROR: ${errorMsg}`));

          // Send Sentry event for sync error
          if (sentryConfig.dsn && sentryConfig.sendErrors) {
            Sentry.captureMessage('E2E Training Sync Error', {
              level: 'error',
              tags: {
                kb_type: kbType,
                scenario: scenario.name,
                success: 'false',
                failure_reason: 'sync_error'
              },
              extra: {
                training_duration_ms: trainingDuration,
                training_duration_seconds: Math.round(trainingDuration / 1000),
                error_message: errorMsg,
                kb_id: kbId,
                test_run_id: testRunId,
                timeout_ms: timeoutMs
              }
            });
          }

          throw new Error(`Training sync error: ${errorMsg}`);
        }

        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      if (!isTrainingComplete) {
        // Send Sentry event for timeout
        if (sentryConfig.dsn && sentryConfig.sendErrors) {
          const currentTime = Date.now();
          const trainingDuration = currentTime - trainingStartTime;

          Sentry.captureMessage('E2E Training Timeout', {
            level: 'error',
            tags: {
              kb_type: kbType,
              scenario: scenario.name,
              success: 'false',
              failure_reason: 'timeout'
            },
            extra: {
              training_duration_ms: trainingDuration,
              training_duration_seconds: Math.round(trainingDuration / 1000),
              timeout_seconds: timeoutMs / 1000,
              kb_id: kbId,
              test_run_id: testRunId,
              last_status: previousStatus
            }
          });
        }

        throw new Error(`Training timeout after ${timeoutMs / 1000}s`);
      }

    } // End of monitorTrainingProgress function

    // Skip chat verification if requested, if expected to fail, or for website scenarios
    if (skipChatVerification || scenario.expectedOutcome === 'unprocessable' || kbType === 'website') {
      if (skipChatVerification) {
        console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Skipping chat verification as requested`));
      } else if (kbType === 'website') {
        console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Skipping chat verification for website scenario`));
      } else {
        console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Skipping chat verification for expected failure scenario`));
      }
      const totalDuration = Date.now() - startTime;

      // Performance data is automatically captured by the startSpan wrapper

      return {
        kbType,
        scenarioName: scenario.name,
        success: true,
        duration: totalDuration
      };
    }

    // 2d: Chat with replica and verify response
    console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Testing chat with trained content...`));

    let testMessage: string;
    let verificationPassed = false;

    switch (kbType) {
      case 'text':
        testMessage = `What is the rainbow unicorn phrase mentioned in the text?`;
        break;
      case 'file':
        testMessage = `What is the rainbow unicorn phrase mentioned in the text?`;
        break;
      case 'youtube':
        if (scenario.name === 'with_cc') {
          testMessage = `What is the secret passphrase mentioned in the YouTube video?`;
        } else {
          testMessage = `What did you learn from the YouTube video?`;
        }
        break;
      default:
        testMessage = `What information have you been trained on?`;
    }

    const chatResponse = await ChatCompletionsService.postV1ReplicasChatCompletions(
      replicaUuid,
      '2025-03-25',
      undefined,
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
        console.log(chalk.red(`  [${kbType}/${scenario.name}] [KB:${kbId}] ❌ Chat verification failed`));
        console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Expected phrase: ${expectedPhrase}`));
        console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Response: ${responseContent.substring(0, 500)}...`));
      }
    } else if (kbType === 'youtube' && scenario.name === 'with_cc') {
      // For YouTube CC scenario, check for the specific passphrase
      const expectedPhrase = 'ABRACADABRA61';
      verificationPassed = responseContent.includes(expectedPhrase);

      if (!verificationPassed) {
        console.log(chalk.red(`  [${kbType}/${scenario.name}] [KB:${kbId}] ❌ Chat verification failed`));
        console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Expected phrase: ${expectedPhrase}`));
        console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Response: ${responseContent.substring(0, 500)}...`));
      }
    } else {
      // For youtube (non-cc), just check if there's a reasonable response
      // since we can't predict exact content
      verificationPassed = responseContent.length > 20 &&
        !responseContent.toLowerCase().includes('i don\'t have') &&
        !responseContent.toLowerCase().includes('no information');

      if (!verificationPassed) {
        console.log(chalk.red(`  [${kbType}/${scenario.name}] [KB:${kbId}] ❌ Chat verification failed - no meaningful response`));
        console.log(chalk.gray(`  [${kbType}/${scenario.name}] [KB:${kbId}] Response: ${responseContent.substring(0, 500)}...`));
      }
    }

    if (verificationPassed) {
      console.log(chalk.green(`  [${kbType}/${scenario.name}] [KB:${kbId}] ✅ Chat verification passed`));
      const totalDuration = Date.now() - startTime;

      // Performance data is automatically captured by the startSpan wrapper

      return {
        kbType,
        scenarioName: scenario.name,
        success: true,
        duration: totalDuration
      };
    } else {
      const totalDuration = Date.now() - startTime;

      if (sentryConfig.dsn && sentryConfig.sendErrors) {
        Sentry.captureMessage('E2E Training Chat Verification Failed', {
          level: 'error',
          tags: {
            kb_type: kbType,
            scenario: scenario.name,
            success: 'false',
            failure_reason: 'chat_verification'
          },
          extra: {
            total_duration_ms: totalDuration,
            total_duration_seconds: Math.round(totalDuration / 1000),
            training_duration_ms: Date.now() - trainingStartTime,
            training_duration_seconds: Math.round((Date.now() - trainingStartTime) / 1000),
            chat_verification: 'failed',
            kb_id: kbId,
            test_run_id: testRunId,
            timeout_ms: timeoutMs
          }
        });
      }

      return {
        kbType,
        scenarioName: scenario.name,
        success: false,
        error: 'Chat verification failed',
        duration: totalDuration
      };
    }

  } catch (error: any) {
    const errorDetails = formatApiError(error);
    console.log(chalk.red(`[${kbType}/${scenario.name}] ❌ Test failed: ${errorDetails}`));

    // Error handling - span will automatically finish with error

    // Re-throw with the detailed error message
    if (error instanceof ApiError) {
      error.message = errorDetails;
    }
    throw error;
  }
}

// Helper function to perform pre-cleanup of users
async function performPreCleanup(effectiveConfig: any, apiKey: string): Promise<void> {
  console.log(chalk.cyan('🧹 Performing pre-cleanup of users...'));

  // Configure OpenAPI client without user ID first
  configureOpenAPI({ ...effectiveConfig, apiKey });

  try {
    // Get all replicas to find user IDs
    console.log(chalk.gray('  Finding users by listing all replicas...'));
    const replicas = await ReplicasService.getV1Replicas(
      undefined, // ownerUuid
      undefined, // ownerId
      undefined, // page
      1, // pageIndex
      1000, // pageSize - large number to get all replicas
      undefined, // slug
      undefined, // search
      undefined, // tags
      'name', // sort
      undefined, // integration
      '2025-03-25' // xApiVersion
    );

    // Extract unique owner IDs from replicas
    const ownerIds = new Set<string>();
    for (const replica of replicas.items) {
      if (replica.ownerID) {
        ownerIds.add(replica.ownerID);
      }
    }

    console.log(chalk.gray(`  Found ${ownerIds.size} unique users to potentially clean up`));

    // For each owner ID, try to delete that user
    let deletedCount = 0;
    let errorCount = 0;

    for (const ownerId of ownerIds) {
      try {
        // Configure API to impersonate this user
        configureOpenAPI({ ...effectiveConfig, apiKey, userId: ownerId });

        // Try to delete the user
        await UsersService.deleteV1UsersMe('2025-03-25');
        deletedCount++;
        console.log(chalk.gray(`  ✅ Deleted user: ${ownerId}`));
      } catch (error: any) {
        errorCount++;
        // Only log errors that are not 404 (user already deleted)
        if (error.status !== 404) {
          console.log(chalk.gray(`  ⚠️  Failed to delete user ${ownerId}: ${error.message}`));
        }
      }
    }

    console.log(chalk.green(`✅ Pre-cleanup completed: ${deletedCount} users deleted, ${errorCount} errors`));

  } catch (error: any) {
    console.log(chalk.red(`❌ Pre-cleanup failed: ${formatApiError(error)}`));
    // Don't exit - continue with the test
  }
}

export async function e2eCommand(options: E2EOptions = {}): Promise<void> {
  try {
    // Get configuration
    const effectiveConfig = await ConfigManager.getEffectiveConfig(process.cwd());

    // Configure Sentry if DSN is provided
    const sentryDsn = options.sentryDsn || effectiveConfig.sentryDsn;
    const sentryEnvironment = options.sentryEnvironment || effectiveConfig.sentryEnvironment || 'unspecified';
    const sentrySendErrors = options.sentrySendErrors || false;
    const sentrySendPerformanceMetrics = options.sentrySendPerformanceMetrics || false;

    const sentryConfig = {
      dsn: sentryDsn,
      environment: sentryEnvironment,
      sendErrors: sentrySendErrors,
      sendPerformanceMetrics: sentrySendPerformanceMetrics
    };

    if (sentryDsn && (sentrySendErrors || sentrySendPerformanceMetrics)) {
      Sentry.init({
        dsn: sentryDsn,
        environment: sentryEnvironment,
        tracesSampleRate: 1.0,
      });
      const features = [];
      if (sentrySendErrors) features.push('errors');
      if (sentrySendPerformanceMetrics) features.push('performance');
      console.log(chalk.gray(`📊 Sentry initialized (environment: ${sentryEnvironment}, features: ${features.join(', ')})`));
    }
    
    // Configure API authentication
    const apiKey = options.apikey || effectiveConfig.apiKey || process.env.SENSAY_API_KEY;
    if (!apiKey) {
      console.error(chalk.red('❌ API key is required. Use --apikey option or configure it.'));
      process.exit(1);
    }

    // Perform pre-cleanup if requested
    if (options.preCleanup) {
      await performPreCleanup(effectiveConfig, apiKey);
    }

    // Configure OpenAPI client
    configureOpenAPI({
      ...effectiveConfig,
      apiKey,
      verbose: options.verbose,
      veryVerbose: options.veryVerbose
    });

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

    // Parse KB files and content types for 'file' KB type (optional)
    const kbFilePaths: string[] = (options.kbFiles ? options.kbFiles.split(',').map(s => s.trim()).filter(Boolean) : []);
    const kbContentTypes: string[] = (options.kbContentTypes ? options.kbContentTypes.split(',').map(s => s.trim()) : []);

    console.log(chalk.blue('\n🧪 Starting E2E tests...'));
    console.log(chalk.gray(`Timeout: ${timeoutMs / 1000}s`));
    console.log(chalk.gray(`KB Types: ${kbTypesToTest.join(', ')}`));

    if (options.simulateFailure) {
      console.log(chalk.yellow('⚠️  SIMULATE FAILURE MODE: All tests will fail for Sentry testing'));
    }

    // Count total scenarios (files map 1:1 to scenarios; fallback to default when none provided)
    let totalScenarios = 0;
    for (const kbType of kbTypesToTest) {
      if (kbType === 'file') {
        totalScenarios += kbFilePaths.length > 0
          ? kbFilePaths.length
          : (KB_TEST_SCENARIOS[kbType] || [{ name: 'standard' }]).length;
      } else {
        totalScenarios += (KB_TEST_SCENARIOS[kbType] || [{ name: 'standard' }]).length;
      }
    }
    console.log(chalk.gray(`Total scenarios: ${totalScenarios}\n`));

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

      const userResponse = await UsersService.postV1Users('2025-03-25', undefined, {
        name: testUserName,
        email: testEmail
      });

      userId = userResponse.id;

      if (!userId) {
        throw new Error('Failed to create user - no ID returned');
      }

      // Update OpenAPI headers with user ID
      configureOpenAPI({
        ...effectiveConfig,
        apiKey,
        userId,
        verbose: options.verbose,
        veryVerbose: options.veryVerbose
      });

      console.log(chalk.green(`✅ User created: ${userId}\n`));

      // Step 2: Run tests for each KB type and scenario
      // Build list of all test scenarios to run
      const allTests: Array<{ kbType: string; scenario: KBTestScenario }> = [];
      for (const kbType of kbTypesToTest) {
        if (kbType === 'file' && kbFilePaths.length > 0) {
          // Build one scenario per provided file
          kbFilePaths.forEach((filePath, index) => {
            const providedType = kbContentTypes[index];
            const scenario: KBTestScenario = {
              name: path.basename(filePath),
              expectedOutcome: 'success',
              description: `Upload file ${path.basename(filePath)}`,
              filePath,
              contentType: providedType || inferContentTypeFromFilename(filePath)
            };
            allTests.push({ kbType, scenario });
          });
        } else {
          // Fallback to default scenarios (e.g., synthetic txt file)
          const scenarios = KB_TEST_SCENARIOS[kbType] || [{ name: 'standard', expectedOutcome: 'success' } as KBTestScenario];
          for (const scenario of scenarios) {
            allTests.push({ kbType, scenario });
          }
        }
      }

      if (options.parallel) {
        console.log(chalk.cyan('\n🚀 Running tests in parallel mode...'));
        console.log(chalk.gray(`  Starting ${allTests.length} tests simultaneously at ${new Date().toISOString()}`));

        // Create all test tasks - they start executing immediately
        const testTasks = allTests.map(({ kbType, scenario }) =>
          runKBTypeTest(kbType, scenario, userId, testRunId, timeoutMs, options.skipChatVerification || false, sentryConfig, options.simulateFailure || false)
        );

        // Wait for all tests to complete
        const parallelResults = await Promise.allSettled(testTasks);
        console.log(chalk.gray(`  All tests completed at ${new Date().toISOString()}`));

        // Process results
        parallelResults.forEach((result, index) => {
          const { kbType, scenario } = allTests[index];
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            // The error message already includes the test info from the catch block
            // but we'll ensure it's also shown here for clarity
            const errorMsg = result.reason?.message || result.reason;
            // Error message already includes test info from the catch block
            results.push({
              kbType,
              scenarioName: scenario.name,
              success: false,
              error: errorMsg,
              duration: 0
            });
          }
        });
      } else {
        // Sequential mode
        for (const { kbType, scenario } of allTests) {
          try {
            const result = await runKBTypeTest(kbType, scenario, userId, testRunId, timeoutMs, options.skipChatVerification || false, sentryConfig, options.simulateFailure || false);
            results.push(result);
          } catch (error: any) {
            results.push({
              kbType,
              scenarioName: scenario.name,
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
        await fs.remove(tempDir).catch(() => { });
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
      const testName = `${result.kbType}/${result.scenarioName}`;
      console.log(`${status} ${testName.padEnd(20)} (${duration})${result.error ? ` - ${result.error}` : ''}`);
    }

    // Exit with appropriate code
    process.exit(failureCount > 0 ? 1 : 0);

  } catch (error: any) {
    const errorDetails = formatApiError(error);
    console.error(chalk.red(`\n❌ Error: ${errorDetails}`));
    process.exit(1);
  }
}

export function setupE2ECommand(program: Command): void {
  const cmd = program
    .command('e2e')
    .alias('e')
    .description('Run end-to-end tests for Sensay API operations')
    .option('--apikey <key>', 'API key for authentication')
    .option('--timeout <seconds>', 'timeout for each test in seconds', '300')
    .option('--kb-types <types>', 'comma-separated list of KB types to test (text,file,website,youtube)')
    .option('--kb-files <paths>', 'comma-separated list of file paths to upload when kb type includes file')
    .option('--kb-content-types <types>', 'comma-separated list of content types matching --kb-files')
    .option('--parallel', 'run KB type tests in parallel')
    .option('--skip-chat-verification', 'skip chat verification after training')
    .option('--sentry-dsn <dsn>', 'Sentry DSN for error reporting and performance metrics')
    .option('--sentry-environment <env>', 'Sentry environment (defaults to "unspecified")')
    .option('--sentry-send-errors', 'send error events to Sentry when tests fail')
    .option('--sentry-send-performance-metrics', 'send performance metrics to Sentry for passing tests')
    .option('--simulate-failure', 'make all tests fail to test Sentry integration')
    .option('--pre-cleanup', 'delete all users in the organization before running tests')
    .action((options) => {
      const globalOptions = program.opts();
      return e2eCommand({ ...options, ...globalOptions });
    });
}