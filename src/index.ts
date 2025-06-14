#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { setupClaimKeyCommand } from './commands/claim-key';
import { setupSimpleOrganizationSetupCommand } from './commands/simple-organization-setup';
import { setupChatCommand } from './commands/chat';
import { setupListCommand } from './commands/list';
import { setupConversationsCommand } from './commands/conversations';

const program = new Command();

program
  .name('sensay')
  .description('CLI tool for Sensay API operations')
  .version('1.0.0');

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

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode')
  .action(async () => {
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
        { name: '🗣️ Query Conversations', value: 'conversations' },
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
      case 'exit':
        console.log(chalk.blue('👋 Goodbye!'));
        break;
    }
  });

// Help command with detailed information
program
  .command('help-detailed')
  .description('Show detailed help with examples')
  .action(() => {
    console.log('Sensay CLI 1.0.1 - Detailed Help and Configuration\n');
    
    console.log('Environment Variables:');
    console.log('  SENSAY_API_KEY         Your Sensay API key');
    console.log('  SENSAY_ORGANIZATION_ID Your organization ID');
    console.log('  SENSAY_USER_ID         Your user ID');
    console.log('  SENSAY_BASE_URL        API base URL (default: https://api.sensay.io)\n');
    
    console.log('Configuration Files:');
    console.log('  ~/.sensay/config.json  User-wide configuration');
    console.log('  ./sensay.config.json   Project-specific configuration\n');
    
    console.log('Configuration Priority (highest to lowest):');
    console.log('  1. Command line arguments');
    console.log('  2. Environment variables');
    console.log('  3. Interactive prompts (when not using --non-interactive)');
    console.log('  4. Project configuration (./sensay.config.json)');
    console.log('  5. User configuration (~/.sensay/config.json)\n');
    
    console.log('Common Usage Examples:');
    console.log('  sensay claim-key');
    console.log('  sensay claim-key -o "My Org" -n "John Doe" -e "john@example.com"');
    console.log('  sensay simple-organization-setup');
    console.log('  sensay simple-organization-setup ./my-project -r "My Replica"');
    console.log('  sensay chat -r "Assistant" -m "Hello"');
    console.log('  sensay list --organization org-123');
    console.log('  sensay conversations -r replica-456 --output results.json\n');
    
    console.log('Project File Structure:');
    console.log('  your-project/');
    console.log('  ├── system-message.txt     Optional: LLM system message');
    console.log('  ├── training-data/         Optional: Training files folder');
    console.log('  │   ├── file1.txt');
    console.log('  │   ├── file2.md');
    console.log('  │   └── subfolder/');
    console.log('  │       └── file3.json');
    console.log('  └── sensay.config.json     Auto-generated project config\n');
    
    console.log('Supported Training File Types:');
    console.log('  .txt, .md, .json, .csv, .log (max 10MB each)\n');
    
    console.log('All commands support both interactive prompts and command-line arguments.');
    console.log('Use --non-interactive flag for script automation.');
  });

// Configure help to follow wget style
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name(),
  formatHelp: (cmd, helper) => {
    const termWidth = helper.padWidth(cmd, helper);
    const helpWidth = helper.helpWidth || 80;
    const itemIndentWidth = 2;
    const itemSeparatorWidth = 2;
    
    // Header section
    let str = `Sensay CLI 1.0.1, a tool for Sensay API operations.
Usage: ${helper.commandUsage(cmd)}

Mandatory arguments to long options are mandatory for short options too.

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

    str += `Use 'sensay COMMAND --help' for more information on a command.
Use 'sensay help-detailed' for examples and configuration information.`;

    return str;
  }
});

program.parse();

// Show interactive mode by default if no command is provided (unless --non-interactive is used)
if (!process.argv.slice(2).length) {
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
          { name: '🗣️ Query Conversations', value: 'conversations' },
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
        case 'exit':
          console.log(chalk.blue('👋 Goodbye!'));
          break;
      }
    };
    
    startInteractiveMode().catch(console.error);
  }
}