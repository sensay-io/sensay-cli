#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { setupClaimKeyCommand } from './commands/claim-key';
import { setupSimpleOrganizationSetupCommand } from './commands/simple-organization-setup';

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
    console.log(chalk.blue('📖 Sensay CLI - Detailed Help\n'));
    
    console.log(chalk.yellow('Environment Variables:'));
    console.log('  SENSAY_API_KEY         - Your Sensay API key');
    console.log('  SENSAY_ORGANIZATION_ID - Your organization ID');
    console.log('  SENSAY_USER_ID         - Your user ID');
    console.log('  SENSAY_BASE_URL        - API base URL (default: https://api.sensay.io)\n');
    
    console.log(chalk.yellow('Configuration Files:'));
    console.log('  ~/.sensay/config.json  - User-wide configuration');
    console.log('  ./sensay.config.json   - Project-specific configuration\n');
    
    console.log(chalk.yellow('Examples:'));
    console.log('  # Claim an API key interactively');
    console.log('  sensay claim-key\n');
    
    console.log('  # Claim with arguments');
    console.log('  sensay claim-key -o "My Org" -n "John Doe" -e "john@example.com"\n');
    
    console.log('  # Setup organization with current folder');
    console.log('  sensay simple-organization-setup\n');
    
    console.log('  # Setup with specific folder and arguments');
    console.log('  sensay simple-organization-setup ./my-project -r "My Replica"\n');
    
    console.log('  # Interactive mode');
    console.log('  sensay interactive\n');
    
    console.log(chalk.yellow('File Structure:'));
    console.log('  your-project/');
    console.log('  ├── system-message.txt     # Optional: LLM system message');
    console.log('  ├── training-data/         # Optional: Training files folder');
    console.log('  │   ├── file1.txt');
    console.log('  │   ├── file2.md');
    console.log('  │   └── subfolder/');
    console.log('  │       └── file3.json');
    console.log('  └── sensay.config.json     # Auto-generated project config\n');
    
    console.log(chalk.yellow('Supported Training File Types:'));
    console.log('  .txt, .md, .json, .csv, .log (max 10MB each)\n');
    
    console.log(chalk.green('💡 Tip: All commands support both interactive prompts and command-line arguments!'));
  });

// Error handling
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name()
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
        case 'exit':
          console.log(chalk.blue('👋 Goodbye!'));
          break;
      }
    };
    
    startInteractiveMode().catch(console.error);
  }
}