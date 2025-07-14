import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from '../config/manager';
import { configureOpenAPI } from '../utils/openapi-config';
import inquirer from 'inquirer';
import { ApiError, UsersService, ReplicasService, TrainingService, KnowledgeBaseService } from '../generated/index';
import { ProgressManager } from '../utils/progress';

interface ReportOptions {
  output?: string;
  apiKey?: string;
  silent?: boolean;
  nonInteractive?: boolean;
  verbose?: boolean;
  veryVerbose?: boolean;
}

export async function reportCommand(folderPath?: string, options: ReportOptions = {}): Promise<void> {
  const targetPath = folderPath || '.';
  const progress = new ProgressManager();

  try {
    // Load configurations
    const effectiveConfig = await ConfigManager.getEffectiveConfig(targetPath);
    
    // Get API key
    let apiKey = options.apiKey || effectiveConfig.apiKey;
    
    if (!apiKey && !options.nonInteractive) {
      const { apiKeyInput } = await inquirer.prompt({
        type: 'password',
        name: 'apiKeyInput',
        message: 'API Key:',
        validate: (input: string) => input.trim().length > 0 || 'API key is required'
      });
      apiKey = apiKeyInput;
    }
    
    if (!apiKey) {
      console.error(chalk.red('❌ No API key found. Please run "sensay claim-key" first or provide --apikey option.'));
      process.exit(1);
    }

    // Get output file path
    const defaultOutput = path.join(targetPath, 'organization-report.md');
    let outputPath = options.output || defaultOutput;
    
    if (!options.output && !options.silent && !options.nonInteractive) {
      const { outputInput } = await inquirer.prompt({
        type: 'input',
        name: 'outputInput',
        message: 'Output file path:',
        default: defaultOutput
      });
      outputPath = outputInput;
    }

    // Configure the OpenAPI client
    configureOpenAPI({ 
      apiKey,
      verbose: options.verbose, 
      veryVerbose: options.veryVerbose 
    });

    // Start generating report
    const mainSpinner = progress.createSpinner('report', 'Generating organization report...');

    try {
      // Fetch all entity data
      mainSpinner.text = 'Fetching replicas...';
      const replicasResponse = await ReplicasService.getV1Replicas();
      const replicas = replicasResponse.items || [];

      // Fetch knowledge base items for all replicas
      mainSpinner.text = 'Fetching knowledge base items...';
      const knowledgeBasePromises = replicas.map(async (replica) => {
        try {
          const response = await KnowledgeBaseService.getV1ReplicasKnowledgeBase(replica.uuid!);
          return { replicaUuid: replica.uuid!, items: response.items || [] };
        } catch (error) {
          // If fetching fails for a replica, return empty array
          return { replicaUuid: replica.uuid!, items: [] };
        }
      });
      
      const knowledgeBaseResults = await Promise.all(knowledgeBasePromises);
      const knowledgeBaseMap = new Map(
        knowledgeBaseResults.map(result => [result.replicaUuid, result.items])
      );

      // Generate the markdown report
      mainSpinner.text = 'Generating markdown report...';
      const report = generateMarkdownReport(effectiveConfig, replicas, knowledgeBaseMap);

      // Write the report to file
      mainSpinner.text = 'Writing report to file...';
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, report, 'utf8');

      mainSpinner.succeed(`Report generated successfully: ${outputPath}`);
      
      if (!options.silent) {
        console.log(chalk.green(`\n✓ Organization report saved to: ${outputPath}`));
      }

    } catch (error: any) {
      mainSpinner.fail('Failed to generate report');
      throw error;
    }

  } catch (error: any) {
    console.error(chalk.red('\n❌ Report generation failed:'));
    
    if (error instanceof ApiError) {
      console.error(chalk.red(`Status: ${error.status}`));
      console.error(chalk.red(`Error: ${error.message}`));
      
      if (error.body) {
        const body = error.body as any;
        if (body.request_id) {
          console.error(chalk.red(`Request ID: ${body.request_id}`));
        }
        if (body.fingerprint) {
          console.error(chalk.red(`Fingerprint: ${body.fingerprint}`));
        }
        if (body.detail) {
          console.error(chalk.red(`Detail: ${body.detail}`));
        }
        if (body.error) {
          console.error(chalk.red(`API Error: ${body.error}`));
        }
        if (body.message) {
          console.error(chalk.red(`Message: ${body.message}`));
        }
      }
      
      // Log request details in verbose mode
      if (options.verbose || options.veryVerbose) {
        console.error(chalk.gray('\nRequest details:'));
        console.error(chalk.gray(`URL: ${error.url}`));
        console.error(chalk.gray(`Method: ${error.request.method}`));
        if (error.request.headers) {
          console.error(chalk.gray('Headers:'));
          Object.entries(error.request.headers).forEach(([key, value]) => {
            if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('key')) {
              console.error(chalk.gray(`  ${key}: [REDACTED]`));
            } else {
              console.error(chalk.gray(`  ${key}: ${value}`));
            }
          });
        }
      }
    } else {
      console.error(chalk.red(`Error: ${error.message || error}`));
    }
    
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

function generateMarkdownReport(
  config: any,
  replicas: any[],
  knowledgeBaseMap: Map<string, any[]>
): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`# Organization Report`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Organization ID:** ${config.organizationId || 'Unknown'}`);
  lines.push('');
  
  // Replicas Section
  lines.push('## Replicas');
  lines.push('');
  
  if (replicas.length === 0) {
    lines.push('*No replicas found*');
  } else {
    // Table header
    lines.push('| Name | Model | UUID | System Message | Created |');
    lines.push('|------|-------|------|----------------|---------|');
    
    // Table rows
    replicas.forEach(replica => {
      const name = replica.name || 'N/A';
      const model = replica.model || 'N/A';
      const uuid = replica.uuid || 'N/A';
      const systemMessage = replica.systemMessage ? 
        (replica.systemMessage.length > 50 ? 
          replica.systemMessage.substring(0, 47) + '...' : 
          replica.systemMessage) : 'N/A';
      const created = replica.createdAt ? new Date(replica.createdAt).toLocaleDateString() : 'N/A';
      
      lines.push(`| ${name} | ${model} | ${uuid} | ${systemMessage} | ${created} |`);
    });
  }
  
  lines.push('');
  
  // Knowledge Base Items Section
  lines.push('## Knowledge Base Items');
  lines.push('');
  
  let hasAnyItems = false;
  replicas.forEach(replica => {
    const items = knowledgeBaseMap.get(replica.uuid!) || [];
    if (items.length > 0) {
      hasAnyItems = true;
      lines.push(`### Replica: ${replica.name}`);
      lines.push('');
      
      // Table header
      lines.push('| Filename | Status | Type | Size | KB ID |');
      lines.push('|----------|---------|------|------|-------|');
      
      // Table rows
      items.forEach(item => {
        const filename = item.filename || 'N/A';
        const status = item.status || 'N/A';
        const type = item.type || 'N/A';
        const size = item.size ? `${(item.size / 1024).toFixed(2)} KB` : 'N/A';
        const kbId = item.id || 'N/A';
        
        lines.push(`| ${filename} | ${status} | ${type} | ${size} | ${kbId} |`);
      });
      
      lines.push('');
    }
  });
  
  if (!hasAnyItems) {
    lines.push('*No knowledge base items found*');
    lines.push('');
  }
  
  return lines.join('\n');
}

export function setupReportCommand(program: Command): void {
  // Add the main command
  const cmd = program
    .command('report [folder-path]')
    .alias('r')
    .description('Generate a markdown report for the organization')
    .option('-o, --output <path>', 'Output file path (default: ./organization-report.md)')
    .option('--apikey <key>', 'API key for authentication')
    .option('-s, --silent', 'Skip interactive prompts and use defaults')
    .action((folderPath, options) => {
      const globalOptions = program.opts();
      return reportCommand(folderPath, { 
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
      
      let str = `Sensay CLI 1.0.1 - Organization Report Generator
Usage: ${helper.commandUsage(cmd)}

Generate a comprehensive markdown report for your organization showing:
  - All replicas with model information  
  - All knowledge base items with training status and filenames

The report is saved as a markdown file that can be viewed or converted
to other formats.

Options:
`;

      // Options
      const options = cmd.options.filter(o => o.flags);
      options.forEach(option => {
        const flags = helper.optionTerm(option);
        const description = helper.optionDescription(option) || '';
        str += `  ${flags.padEnd(termWidth)}${description}\n`;
      });

      str += `
Global Options:
  -v, --verbose             Show API request details
  -vv, --very-verbose       Show full API request/response
  --non-interactive         Disable interactive prompts

Examples:
  sensay report
  sensay r
  sensay report ./my-project
  sensay report -o ./reports/org-report.md
  sensay report --apikey sk-1234... --silent`;

      return str;
    }
  });
}