import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { SensayApiClient } from '../api/client.js';
import { ConfigManager } from '../config/manager.js';

const INTERNAL_CODE = 'GNEFSHAF';

interface ClaimKeyOptions {
  organizationName?: string;
  name?: string;
  email?: string;
  saveLocation?: 'user' | 'project';
}

export async function claimKeyCommand(options: ClaimKeyOptions): Promise<void> {
  console.log(chalk.blue('🔑 Claiming Sensay API Key\n'));

  let { organizationName, name, email, saveLocation } = options;

  if (!organizationName || !name || !email) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'organizationName',
        message: 'Organization name:',
        when: !organizationName,
        validate: (input: string) => input.trim().length > 0 || 'Organization name is required'
      },
      {
        type: 'input',
        name: 'name',
        message: 'Your name:',
        when: !name,
        validate: (input: string) => input.trim().length > 0 || 'Name is required'
      },
      {
        type: 'input',
        name: 'email',
        message: 'Your email:',
        when: !email,
        validate: (input: string) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || 'Please enter a valid email address';
        }
      }
    ]);

    organizationName = organizationName || answers.organizationName;
    name = name || answers.name;
    email = email || answers.email;
  }

  if (!saveLocation) {
    const { location } = await inquirer.prompt({
      type: 'list',
      name: 'location',
      message: 'Where would you like to save the API key?',
      choices: [
        { name: 'User config (~/.sensay/config.json)', value: 'user' },
        { name: 'Current project (./sensay.config.json)', value: 'project' }
      ]
    });
    saveLocation = location;
  }

  console.log(chalk.yellow('🔄 Claiming API key...'));

  try {
    const client = new SensayApiClient({});
    const response = await client.claimApiKey(INTERNAL_CODE, {
      organizationName: organizationName!,
      name: name!,
      email: email!
    });

    console.log(chalk.green('✅ API key claimed successfully!'));
    console.log(chalk.cyan(`📋 Organization ID: ${response.organizationId}`));
    
    if (response.expirationDate) {
      const expirationDate = new Date(response.expirationDate);
      const now = new Date();
      
      if (expirationDate <= now) {
        console.log(chalk.red('⚠️  WARNING: Your organization has expired!'));
        console.log(chalk.yellow('Please contact support to update the expiration date manually in the database.'));
      } else {
        console.log(chalk.blue(`📅 Expires: ${expirationDate.toLocaleDateString()}`));
      }
    }

    const config = {
      apiKey: response.organizationSecret,
      organizationId: response.organizationId
    };

    if (saveLocation === 'user') {
      await ConfigManager.saveUserConfig(config);
      console.log(chalk.green('💾 Configuration saved to user config'));
    } else {
      await ConfigManager.saveProjectConfig(config);
      console.log(chalk.green('💾 Configuration saved to project config'));
    }

  } catch (error: any) {
    console.error(chalk.red('❌ Failed to claim API key:'));
    console.error(chalk.red(error.response?.data?.message || error.message));
    process.exit(1);
  }
}

export function setupClaimKeyCommand(program: Command): void {
  program
    .command('claim-key')
    .description('Claim an API key using internal code')
    .option('-o, --organization-name <name>', 'Organization name')
    .option('-n, --name <name>', 'Your name')
    .option('-e, --email <email>', 'Your email')
    .option('-s, --save-location <location>', 'Save location (user|project)')
    .action(claimKeyCommand);
}