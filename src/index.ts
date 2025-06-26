#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { setupClaimKeyCommand } from './commands/claim-key';
import { setupSimpleOrganizationSetupCommand } from './commands/simple-organization-setup';
import { setupChatCommand } from './commands/chat';
import { setupListCommand } from './commands/list';
import { setupConversationsCommand } from './commands/conversations';
import { setupRetrainFailedCommand } from './commands/retrain-failed';
import { setupHashKeyCommand } from './commands/hash-key';
import { setupE2ECommand } from './commands/e2e';
import { setupExplorerCommand } from './commands/explorer';

const program = new Command();

program
  .name('sensay')
  .description('CLI tool for Sensay API operations')
  .version('1.0.0')
  .usage('[command] [options]');

program
  .option('-v, --verbose', 'Enable verbose output')
  .option('--no-color', 'Disable colored output')
  .option('--non-interactive', 'Disable interactive mode (for scripts/CI)');

// Setup commands
setupClaimKeyCommand(program);
setupSimpleOrganizationSetupCommand(program);
setupChatCommand(program);
setupListCommand(program);
setupConversationsCommand(program);
setupRetrainFailedCommand(program);
setupHashKeyCommand(program);
setupE2ECommand(program);
setupExplorerCommand(program);

// Hidden help command (undocumented) that triggers --help
program
  .command('help', { hidden: true })
  .description('Show help information')
  .action(() => {
    program.outputHelp();
  });


// Configure help to follow wget style
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name(),
  formatHelp: (cmd, helper) => {
    const termWidth = helper.padWidth(cmd, helper);
    
    // Header section
    let str = `Sensay CLI 1.0.1, a tool for Sensay API operations.
Usage: ${helper.commandUsage(cmd)}

`;

    // Global Options section
    const globalOptions = cmd.options.filter(option => option.flags);
    if (globalOptions.length > 0) {
      str += 'Global Options:\n';
      globalOptions.forEach(option => {
        const flags = helper.optionTerm(option);
        const description = helper.optionDescription(option);
        str += `  ${flags.padEnd(termWidth)}${description}\n`;
      });
      str += '\n';
    }

    // Commands section
    const commands = cmd.commands.filter((command: any) => !command._hidden);
    if (commands.length > 0) {
      str += 'Commands:\n';
      commands.forEach((command: any) => {
        const term = helper.subcommandTerm(command);
        const description = helper.subcommandDescription(command) || '';
        str += `  ${term.padEnd(termWidth)}${description}\n`;
      });
      str += '\n';
    }

    str += `Use 'sensay COMMAND --help' for more information on a command.`;

    return str;
  }
});

program.parse();

// Show interactive mode by default if no command is provided (unless --non-interactive is used)
// Check if any command was matched by looking at the args after parsing
const commandMatched = program.args.length > 0;

if (!commandMatched && !program.opts().help && !program.opts().version) {
  const options = program.opts();
  if (options.nonInteractive) {
    program.outputHelp();
  } else {
    // Start interactive mode by default
    const startInteractiveMode = async () => {
      const inquirer = await import('inquirer');
      
      console.log(chalk.blue('🎯 Sensay CLI - Interactive Mode\n'));
      
      const { action } = await inquirer.default.prompt({
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔑 Claim API Key', value: 'claim-key' },
          { name: '🚀 Simple Organization Setup', value: 'setup' },
          { name: '💬 Chat with Replica', value: 'chat' },
          { name: '📊 List Entities', value: 'list' },
          { name: '🔍 Explorer', value: 'explorer' },
          { name: '🗣️ Query Conversations', value: 'conversations' },
          { name: '🔄 Retrain Failed Items', value: 'retrain-failed' },
          { name: '🧪 Run E2E Tests', value: 'e2e' },
          { name: '❌ Exit', value: 'exit' }
        ]
      });

      switch (action) {
        case 'claim-key': {
          const { claimKeyCommand } = await import('./commands/claim-key');
          await claimKeyCommand({});
          break;
        }
        case 'setup': {
          // Ask for working folder path first
          const { folderPath } = await inquirer.default.prompt({
            type: 'input',
            name: 'folderPath',
            message: 'Working folder path for your project:',
            default: '.',
            validate: (input: string) => input.trim().length > 0 || 'Folder path is required'
          });
          
          const { simpleOrganizationSetupCommand } = await import('./commands/simple-organization-setup');
          await simpleOrganizationSetupCommand(folderPath.trim());
          break;
        }
        case 'chat': {
          // Ask for working folder path first
          const { folderPath } = await inquirer.default.prompt({
            type: 'input',
            name: 'folderPath',
            message: 'Working folder path for your project:',
            default: '.',
            validate: (input: string) => input.trim().length > 0 || 'Folder path is required'
          });
          
          const { chatCommand } = await import('./commands/chat');
          await chatCommand(folderPath.trim());
          break;
        }
        case 'list': {
          const { listCommand } = await import('./commands/list');
          await listCommand({});
          break;
        }
        case 'conversations': {
          const { conversationsCommand } = await import('./commands/conversations');
          await conversationsCommand({});
          break;
        }
        case 'retrain-failed': {
          // Ask for working folder path first
          const { folderPath } = await inquirer.default.prompt({
            type: 'input',
            name: 'folderPath',
            message: 'Working folder path for your project:',
            default: '.',
            validate: (input: string) => input.trim().length > 0 || 'Folder path is required'
          });
          
          const { retrainFailedCommand } = await import('./commands/retrain-failed');
          await retrainFailedCommand(folderPath.trim(), {});
          break;
        }
        case 'e2e': {
          const { e2eCommand } = await import('./commands/e2e');
          await e2eCommand({});
          break;
        }
        case 'explorer': {
          const { explorerCommand } = await import('./commands/explorer');
          await explorerCommand();
          break;
        }
        case 'exit':
          console.log(chalk.blue('👋 Goodbye!'));
          break;
      }
    };
    
    startInteractiveMode().catch(console.error);
  }
}