import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { ChatCompletionsService, ApiError, OpenAPI } from '../generated/index';
import { ConfigManager } from '../config/manager';

interface ChatOptions {
  replicaName?: string;
  message?: string;
  nonInteractive?: boolean;
}

export async function chatCommand(folderPath?: string, options: ChatOptions = {}): Promise<void> {
  const targetPath = folderPath || '.';
  
  try {
    // Load configurations following standard priority pattern
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
    OpenAPI.HEADERS = {
      'X-API-Version': '2025-03-25',
      'X-ORGANIZATION-SECRET': effectiveConfig.apiKey,
    };
    
    if (effectiveConfig.userId) {
      OpenAPI.HEADERS['X-USER-ID'] = effectiveConfig.userId;
    }

    // Get replica name following standard priority pattern
    let { replicaName, message } = options;

    if (!replicaName) {
      if (options.nonInteractive) {
        // Try project config, then fail
        replicaName = projectConfig.replicaName;
        if (!replicaName) {
          console.error(chalk.red('❌ Missing --replica-name parameter in non-interactive mode'));
          console.error(chalk.red('   Either provide --replica-name or set replicaName in sensay.config.json'));
          process.exit(1);
        }
      } else {
        // Interactive prompt with default from config
        const { replica } = await inquirer.prompt({
          type: 'input',
          name: 'replica',
          message: 'Replica name:',
          default: projectConfig.replicaName,
          validate: (input: string) => input.trim().length > 0 || 'Replica name is required'
        });
        replicaName = replica;
      }
    }

    // Find replica UUID by name
    const { ReplicasService } = await import('../generated/index');
    const replicasResponse = await ReplicasService.getV1Replicas();
    const replica = replicasResponse.items?.find(r => r.name === replicaName);

    if (!replica) {
      console.error(chalk.red(`❌ Replica "${replicaName}" not found.`));
      console.error(chalk.yellow('💡 Available replicas:'));
      if (replicasResponse.items && replicasResponse.items.length > 0) {
        replicasResponse.items.forEach(r => {
          console.error(chalk.gray(`   - ${r.name}`));
        });
      } else {
        console.error(chalk.gray('   No replicas found. Create one with "sensay simple-organization-setup"'));
      }
      process.exit(1);
    }

    if (options.nonInteractive) {
      // Non-interactive mode: single message
      if (!message) {
        console.error(chalk.red('❌ Missing --message parameter in non-interactive mode'));
        process.exit(1);
      }

      console.log(chalk.blue(`💬 Chatting with ${replica.name}...\n`));
      console.log(chalk.cyan('You: ') + message);

      const response = await ChatCompletionsService.postV1ReplicasChatCompletions(
        replica.uuid,
        '2025-03-25',
        {
          content: message,
          source: 'web'
        }
      );

      console.log(chalk.green(`${replica.name}: `) + response.content);
    } else {
      // Interactive mode: continuous chat
      console.log(chalk.blue(`💬 Starting chat with ${replica.name}`));
      console.log(chalk.gray('Type "quit", "exit", or press Ctrl+C to end the conversation\n'));

      while (true) {
        const { userMessage } = await inquirer.prompt({
          type: 'input',
          name: 'userMessage',
          message: chalk.cyan('You:'),
          validate: (input: string) => {
            const trimmed = input.trim();
            if (trimmed === '') return 'Please enter a message';
            return true;
          }
        });

        const trimmedMessage = userMessage.trim();
        
        // Check for exit commands
        if (['quit', 'exit', 'q'].includes(trimmedMessage.toLowerCase())) {
          console.log(chalk.blue('\n👋 Chat ended. Goodbye!'));
          break;
        }

        try {
          const response = await ChatCompletionsService.postV1ReplicasChatCompletions(
            replica.uuid,
            '2025-03-25',
            {
              content: trimmedMessage,
              source: 'web'
            }
          );

          console.log(chalk.green(`${replica.name}: `) + response.content + '\n');
        } catch (error: any) {
          if (error instanceof ApiError) {
            console.error(chalk.red(`❌ Chat error: ${error.message}`));
          } else {
            console.error(chalk.red(`❌ Unexpected error: ${error.message || error}`));
          }
          console.log(''); // Add spacing
        }
      }
    }

  } catch (error: any) {
    console.error(chalk.red('\n❌ Chat failed:'));
    
    if (error instanceof ApiError) {
      console.error(chalk.red(`Status: ${error.status}`));
      console.error(chalk.red(`Error: ${error.message}`));
      
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
      console.error(chalk.red('Network error: Could not reach the API'));
      console.error(chalk.red('Please check your internet connection'));
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

export function setupChatCommand(program: Command): void {
  const cmd = program
    .command('chat [folder-path]')
    .description('Chat with a replica')
    .option('-r, --replica-name <name>', 'name of the replica to chat with')
    .option('-m, --message <text>', 'single message for non-interactive mode')
    .action((folderPath, options) => {
      const globalOptions = program.opts();
      return chatCommand(folderPath, { ...options, nonInteractive: globalOptions.nonInteractive });
    });

  // Configure help in wget style for this command
  cmd.configureHelp({
    formatHelp: (cmd, helper) => {
      const termWidth = helper.padWidth(cmd, helper);
      
      let str = `Sensay CLI 1.0.1 - Chat with Replica
Usage: ${helper.commandUsage(cmd)}

Start a chat session with a replica. In interactive mode, you can have a
continuous conversation. In non-interactive mode, send a single message
and receive a response.

Mandatory arguments to long options are mandatory for short options too.

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
  sensay chat
  sensay chat ./my-project
  sensay chat -r "My Assistant" -m "Hello, how are you?"
  sensay chat --replica-name "Support Bot" --non-interactive

The command uses the project configuration to determine which replica to chat
with. Type 'exit' or 'quit' to end an interactive chat session.`;

      return str;
    }
  });
}