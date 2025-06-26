import inquirer from 'inquirer';
import chalk from 'chalk';
import { UsersService, ReplicasService, ApiError } from '../generated/index';

export interface EntityDialogOptions {
  mode: 'select' | 'explorer';
  startLevel?: 'user' | 'replicas';
}

export interface SelectedEntity {
  type: 'user' | 'replica';
  uuid: string;
  name: string;
  data: any;
}

interface DialogLevel {
  type: 'user' | 'replicas';
  items: any[];
  selectedIndex: number;
}

export class EntityDialog {
  private mode: 'select' | 'explorer';
  private levels: DialogLevel[] = [];
  private currentLevelIndex: number = 0;

  constructor(private options: EntityDialogOptions) {
    this.mode = options.mode;
  }

  async show(): Promise<SelectedEntity | null> {
    // Initialize with the start level
    await this.loadLevel(this.options.startLevel || 'replicas');

    while (true) {
      const currentLevel = this.levels[this.currentLevelIndex];
      const choices = this.buildChoices(currentLevel);

      // Build the prompt message
      const promptMessage = this.buildPromptMessage();

      const answer = await inquirer.prompt({
        type: 'list',
        name: 'selection',
        message: promptMessage,
        choices,
        loop: false,
        pageSize: 15,
      });

      const action = await this.handleSelection(answer.selection, currentLevel);
      
      if (action === 'exit') {
        return null;
      } else if (action === 'selected') {
        return this.getSelectedEntity();
      }
      // Continue loop for other actions
    }
  }

  private buildPromptMessage(): string {
    const level = this.levels[this.currentLevelIndex];
    let message = '';

    if (this.mode === 'select') {
      message = `Select ${level.type.slice(0, -1)}`;
    } else {
      message = `Explorer: ${level.type}`;
    }

    message += chalk.gray(` (↑↓: navigate, Enter: select, q: exit)`);

    return message;
  }

  private buildChoices(level: DialogLevel): any[] {
    const choices = [];

    // Add navigation options
    if (this.currentLevelIndex > 0) {
      choices.push({
        name: chalk.gray('← Back'),
        value: 'back',
      });
    }

    // Add entity choices
    level.items.forEach((item, index) => {
      const name = this.formatEntityName(level.type, item);
      choices.push({
        name,
        value: `entity:${index}`,
      });
    });

    // Add special actions
    choices.push(new inquirer.Separator());
    choices.push({
      name: chalk.yellow('↻ Refresh'),
      value: 'refresh',
    });
    choices.push({
      name: chalk.red('✕ Exit'),
      value: 'exit',
    });

    return choices;
  }

  private formatEntityName(type: string, item: any): string {
    switch (type) {
      case 'user':
        return `${item.name || 'Current User'} ${chalk.gray(`<${item.email || 'N/A'}>`)}`;
      case 'replicas':
        return `${item.name} ${chalk.gray(`(${item.status || 'active'})`)}`;
      default:
        return item.name || item.uuid;
    }
  }

  private async handleSelection(selection: any, currentLevel: DialogLevel): Promise<string> {
    if (selection === 'exit') {
      return 'exit';
    }

    if (selection === 'refresh') {
      await this.refreshCurrentLevel();
      return 'continue';
    }

    if (selection === 'back') {
      this.goBack();
      return 'continue';
    }

    if (selection.startsWith('entity:')) {
      const index = parseInt(selection.replace('entity:', ''));
      currentLevel.selectedIndex = index;
      const selectedItem = currentLevel.items[index];

      if (this.mode === 'explorer') {
        // In explorer mode, ask what to do with the entity
        const { action } = await inquirer.prompt({
          type: 'list',
          name: 'action',
          message: `What would you like to do with ${selectedItem.name}?`,
          choices: [
            { name: 'View Details', value: 'details' },
            { name: 'Navigate Deeper', value: 'navigate' },
            { name: 'Back', value: 'back' },
          ],
        });

        if (action === 'details') {
          await this.showEntityDetails(selectedItem, currentLevel.type);
          return 'continue';
        } else if (action === 'navigate') {
          const canNavigateDeeper = await this.navigateDeeper(selectedItem, currentLevel.type);
          if (!canNavigateDeeper) {
            console.log(chalk.yellow('\nCannot navigate deeper from this level.'));
            await this.pause();
          }
          return 'continue';
        } else {
          return 'continue';
        }
      } else {
        // In select mode, just select the entity
        return 'selected';
      }
    }

    return 'continue';
  }

  private async pause(): Promise<void> {
    await inquirer.prompt({
      type: 'input',
      name: 'continue',
      message: chalk.gray('Press Enter to continue...'),
    });
  }

  private async showEntityDetails(item: any, type: string): Promise<void> {
    console.clear();
    console.log(chalk.blue(`\n=== ${type.slice(0, -1).toUpperCase()} DETAILS ===\n`));

    switch (type) {
      case 'user':
        console.log(chalk.cyan('Name:'), item.name || 'N/A');
        console.log(chalk.cyan('Email:'), item.email || 'N/A');
        console.log(chalk.cyan('ID:'), item.id);
        if (item.linkedAccounts && item.linkedAccounts.length > 0) {
          console.log(chalk.cyan('\nLinked Accounts:'));
          item.linkedAccounts.forEach((account: any) => {
            console.log(chalk.gray(`  - ${account.accountType}: ${account.accountID}`));
          });
        }
        break;

      case 'replicas':
        console.log(chalk.cyan('Name:'), item.name);
        console.log(chalk.cyan('UUID:'), item.uuid);
        console.log(chalk.cyan('Status:'), item.status || 'active');
        if (item.createdAt) {
          console.log(chalk.cyan('Created:'), new Date(item.createdAt).toLocaleString());
        }
        if (item.systemMessage) {
          console.log(chalk.cyan('\nSystem Message:'));
          console.log(chalk.gray(item.systemMessage));
        }
        break;
    }

    await this.pause();
  }

  private async navigateDeeper(item: any, currentType: string): Promise<boolean> {
    switch (currentType) {
      case 'user':
        // Navigate to replicas
        await this.loadLevel('replicas');
        this.currentLevelIndex++;
        return true;

      case 'replicas':
        // Cannot navigate deeper
        return false;

      default:
        return false;
    }
  }

  private goBack(): void {
    if (this.currentLevelIndex > 0) {
      this.levels.pop();
      this.currentLevelIndex--;
    }
  }

  private async refreshCurrentLevel(): Promise<void> {
    const currentLevel = this.levels[this.currentLevelIndex];
    
    // Reload the current level
    await this.loadLevel(currentLevel.type);
  }

  private async loadLevel(type: 'user' | 'replicas'): Promise<void> {
    try {
      let items: any[] = [];

      switch (type) {
        case 'user':
          // Get current user info
          const userInfo = await UsersService.getV1UsersMe();
          items = [userInfo];
          break;

        case 'replicas':
          const replicasResponse = await ReplicasService.getV1Replicas();
          items = replicasResponse.items || [];
          break;
      }

      // Update or create the level
      const existingLevelIndex = this.levels.findIndex(l => l.type === type);
      const levelData: DialogLevel = {
        type,
        items,
        selectedIndex: 0,
      };

      if (existingLevelIndex >= 0) {
        // Preserve selected index on refresh
        const oldSelectedIndex = this.levels[existingLevelIndex].selectedIndex;
        levelData.selectedIndex = Math.min(oldSelectedIndex, items.length - 1);
        this.levels[existingLevelIndex] = levelData;
      } else {
        this.levels.push(levelData);
      }

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Failed to load ${type}:`));
      if (error instanceof ApiError) {
        console.error(chalk.red(`Error: ${error.message}`));
      } else {
        console.error(chalk.red(`Error: ${error.message || error}`));
      }
      
      // Exit on error
      process.exit(1);
    }
  }

  private getSelectedEntity(): SelectedEntity | null {
    const currentLevel = this.levels[this.currentLevelIndex];
    const selectedItem = currentLevel.items[currentLevel.selectedIndex];

    if (!selectedItem) {
      return null;
    }

    return {
      type: currentLevel.type.slice(0, -1) as any,
      uuid: selectedItem.uuid,
      name: selectedItem.name,
      data: selectedItem,
    };
  }
}