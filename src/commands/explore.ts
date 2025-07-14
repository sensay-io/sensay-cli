import { Command } from 'commander';
import chalk from 'chalk';
import { EntityDialog, EntityDialogOptions } from '../utils/entity-dialog';
import { ConfigManager } from '../config/manager';
import { configureOpenAPI } from '../utils/openapi-config';

interface ExploreOptions {
  nonInteractive?: boolean;
  verbose?: boolean;
  veryVerbose?: boolean;
}

export async function exploreCommand(folderPath?: string, options: ExploreOptions = {}): Promise<void> {
  const targetPath = folderPath || '.';

  try {
    // Check for non-interactive mode
    if (options.nonInteractive) {
      console.error(chalk.red('❌ Explore command is not available in non-interactive mode'));
      process.exit(1);
    }

    // Load configurations
    const effectiveConfig = await ConfigManager.getEffectiveConfig(targetPath);

    if (!effectiveConfig.apiKey) {
      console.error(chalk.red('❌ No API key found. Please run "sensay claim-key" first.'));
      process.exit(1);
    }

    // Configure the OpenAPI client
    configureOpenAPI({ 
      ...effectiveConfig, 
      verbose: options.verbose, 
      veryVerbose: options.veryVerbose 
    });

    // Create and show the entity dialog in explorer mode
    const dialogOptions: EntityDialogOptions = {
      mode: 'explorer',
    };

    const dialog = new EntityDialog(dialogOptions);
    const result = await dialog.show();

    if (result) {
      console.log(chalk.green(`\n✓ Explored ${result.type}: ${result.name}`));
    } else {
      console.log(chalk.blue('\n👋 Explore closed.'));
    }

  } catch (error: any) {
    console.error(chalk.red('\n❌ Explore failed:'));
    console.error(chalk.red(`Error: ${error.message || error}`));
    
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

export function setupExploreCommand(program: Command): void {
  // Add the main command
  const cmd = program
    .command('explore [folder-path]')
    .alias('x')
    .description('Explore Sensay entities interactively')
    .action((folderPath, options) => {
      const globalOptions = program.opts();
      return exploreCommand(folderPath, { 
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
      
      let str = `Sensay CLI 1.0.1 - Entity Explore
Usage: ${helper.commandUsage(cmd)}

Explore Sensay entities (Organizations, Users, Replicas) in an interactive
GUI interface. Navigate through the entity hierarchy and view details.

Navigation:
  Arrow Keys    Navigate between entities
  Enter         Select/Navigate deeper
  .             View entity details  
  r             Refresh current list
  q             Exit explore
  
The explore shows entities in a hierarchical view:
  Organizations → Users → Replicas

This command is only available in interactive mode.

Examples:
  sensay explore
  sensay x
  sensay explore ./my-project`;

      return str;
    }
  });
}