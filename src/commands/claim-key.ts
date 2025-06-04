import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { SensayApiClient, SensayApiError } from '../generated/index.js';
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
    console.log(chalk.cyan(`📋 Organization ID: ${response.organizationID}`));
    
    if (response.validUntil) {
      const expirationDate = new Date(response.validUntil);
      const now = new Date();
      
      if (expirationDate <= now) {
        console.log(chalk.red('⚠️  WARNING: Your organization has expired!'));
        console.log(chalk.yellow('Please contact support to update the expiration date manually in the database.'));
      } else {
        console.log(chalk.blue(`📅 Expires: ${expirationDate.toLocaleDateString()}`));
      }
    }

    const config = {
      apiKey: response.apiKey,
      organizationId: response.organizationID
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
    
    if (SensayApiClient.isSensayApiError(error)) {
      // Properly typed Sensay API error
      console.error(chalk.red(`Status: ${error.status}`));
      console.error(chalk.red(`Error: ${error.response.error}`));
      
      if (error.requestId) {
        console.error(chalk.gray(`Request ID: ${error.requestId}`));
      }
      
      if (error.fingerprint) {
        console.error(chalk.gray(`Fingerprint: ${error.fingerprint}`));
      }
      
      if (error.status === 400) {
        console.error(chalk.yellow('\n💡 Possible issues:'));
        console.error(chalk.yellow('   • Invalid internal code (check if GNEFSHAF is correct)'));
        console.error(chalk.yellow('   • Code may have expired or already been used'));
        console.error(chalk.yellow('   • Organization name may already exist'));
        console.error(chalk.yellow('   • Email format or validation issues'));
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      // Network error
      console.error(chalk.red('Network error: Could not reach the API'));
      console.error(chalk.red('Please check your internet connection'));
    } else {
      // Other error - show raw response if available
      console.error(chalk.red(`Error: ${error.message}`));
      
      if (error.response?.data) {
        const data = error.response.data;
        if (data.error) {
          console.error(chalk.red(`API Error: ${data.error}`));
        }
        if (data.request_id) {
          console.error(chalk.gray(`Request ID: ${data.request_id}`));
        }
        if (data.fingerprint) {
          console.error(chalk.gray(`Fingerprint: ${data.fingerprint}`));
        }
      }
    }
    
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    } else {
      throw error;
    }
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