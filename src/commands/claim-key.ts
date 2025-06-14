import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { ApiKeysService, ApiError, OpenAPI } from '../generated/index';
import { ConfigManager } from '../config/manager';

const INTERNAL_CODE = 'GNEFSHAF';

interface ClaimKeyOptions {
  organizationName?: string;
  name?: string;
  email?: string;
  saveLocation?: 'user' | 'project';
  nonInteractive?: boolean;
}

export async function claimKeyCommand(options: ClaimKeyOptions): Promise<void> {
  console.log(chalk.blue('🔑 Claiming Sensay API Key\n'));

  let { organizationName, name, email, saveLocation } = options;

  if (!organizationName || !name || !email) {
    if (options.nonInteractive) {
      console.error(chalk.red('❌ Missing required parameters. In non-interactive mode, you must provide:'));
      console.error(chalk.red('   --organization-name <name>'));
      console.error(chalk.red('   --name <name>'));
      console.error(chalk.red('   --email <email>'));
      process.exit(1);
    }
    
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
    if (options.nonInteractive) {
      saveLocation = 'user'; // Default to user config in non-interactive mode
    } else {
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
  }

  console.log(chalk.yellow('🔄 Claiming API key...'));

  try {
    const response = await ApiKeysService.postV1ApiKeysInvitesRedeem(INTERNAL_CODE, {
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
    
    if (error instanceof ApiError) {
      // Properly typed API error from generated client
      console.error(chalk.red(`Status: ${error.status}`));
      console.error(chalk.red(`Error: ${error.message}`));
      
      // Try to get additional error details from the body
      if (error.body) {
        const body = error.body as any;
        if (body.request_id) {
          console.error(chalk.gray(`Request ID: ${body.request_id}`));
        }
        if (body.fingerprint) {
          console.error(chalk.gray(`Fingerprint: ${body.fingerprint}`));
        }
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
      // Other error
      console.error(chalk.red(`Error: ${error.message || error}`));
    }
    
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

export function setupClaimKeyCommand(program: Command): void {
  const cmd = program
    .command('claim-key')
    .description('Claim an API key using internal code')
    .option('-o, --organization-name <name>', 'organization name for your account')
    .option('-n, --name <name>', 'your full name')
    .option('-e, --email <email>', 'your email address')
    .option('-s, --save-location <location>', 'save location: user or project (default: user)')
    .action((options) => {
      const globalOptions = program.opts();
      return claimKeyCommand({ ...options, nonInteractive: globalOptions.nonInteractive });
    });

  // Configure help in wget style for this command
  cmd.configureHelp({
    formatHelp: (cmd, helper) => {
      const termWidth = helper.padWidth(cmd, helper);
      
      let str = `Sensay CLI 1.0.1 - Claim API Key
Usage: ${helper.commandUsage(cmd)}

Claim an API key using the internal organization setup code. This command
creates a new organization and user account, then returns an API key for
accessing Sensay services.

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
  sensay claim-key
  sensay claim-key -o "My Company" -n "John Doe" -e "john@company.com"
  sensay claim-key --save-location project

The API key will be saved to your configuration and used for subsequent commands.`;

      return str;
    }
  });
}