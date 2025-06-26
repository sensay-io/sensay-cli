import chalk from 'chalk';
import inquirer from 'inquirer';
import { ReplicasService, ApiError } from '../generated/index';
import { KeyboardNavigator } from './keyboard-navigator';

export interface EntityDialogOptions {
  mode: 'select' | 'explorer';
}

export interface SelectedEntity {
  type: 'replica';
  uuid: string;
  name: string;
  data: any;
}

export class EntityDialog {
  private mode: 'select' | 'explorer';
  private replicas: any[] = [];
  private selectedIndex: number = 0;
  private navigator: KeyboardNavigator;
  private viewportHeight: number = 15; // Number of items to show at once
  private scrollOffset: number = 0;
  private currentPage: number = 1;
  private pageSize: number = 50;
  private totalReplicas: number = 0;
  private isLoadingMore: boolean = false;

  constructor(private options: EntityDialogOptions) {
    this.mode = options.mode;
    this.navigator = new KeyboardNavigator();
  }

  async show(): Promise<SelectedEntity | null> {
    this.navigator.hideCursor();
    
    try {
      // Load initial data
      await this.loadReplicas(true);

      while (true) {
        this.render();
        
        const key = await this.navigator.waitForKey();
        
        switch (key) {
          case 'up':
            this.moveUp();
            break;
            
          case 'down':
            this.moveDown();
            break;
            
          case 'enter':
          case 'details':
            if (this.mode === 'explorer') {
              await this.showDetails();
            } else {
              return this.getSelectedEntity();
            }
            break;
            
          case 'refresh':
            await this.loadReplicas(false);
            break;
            
          case 'delete':
            if (this.mode === 'explorer' && this.replicas.length > 0) {
              const deleted = await this.deleteReplica();
              if (deleted) {
                await this.loadReplicas(false);
              }
            }
            break;
            
          case 'quit':
          case 'escape':
            return null;
        }
      }
    } finally {
      this.navigator.showCursor();
      this.navigator.cleanup();
    }
  }

  private moveUp(): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      
      // Adjust viewport if needed
      if (this.selectedIndex < this.scrollOffset) {
        this.scrollOffset = this.selectedIndex;
      }
    }
  }

  private moveDown(): void {
    if (this.selectedIndex < this.replicas.length - 1) {
      this.selectedIndex++;
      
      // Adjust viewport if needed
      if (this.selectedIndex >= this.scrollOffset + this.viewportHeight) {
        this.scrollOffset = this.selectedIndex - this.viewportHeight + 1;
      }
      
      // Check if we need to load more replicas
      if (this.selectedIndex >= this.replicas.length - 5 && 
          this.replicas.length < this.totalReplicas && 
          !this.isLoadingMore) {
        this.loadMoreReplicas();
      }
    }
  }

  private render(): void {
    this.navigator.clearScreen();
    
    // Header
    console.log(chalk.blue.bold('┌─────────────────────────────────────────────────────────────────┐'));
    console.log(chalk.blue.bold('│') + chalk.white.bold(' SENSAY EXPLORER'.padEnd(65)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('├─────────────────────────────────────────────────────────────────┤'));
    console.log(chalk.blue.bold('│') + chalk.gray(' Replicas'.padEnd(65)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('└─────────────────────────────────────────────────────────────────┘'));
    
    // Content area
    if (this.replicas.length === 0) {
      console.log();
      console.log(chalk.yellow('  No replicas found.'));
      console.log();
      console.log(chalk.gray('  Create replicas using "sensay simple-organization-setup"'));
    } else {
      // Show items in viewport
      const endIndex = Math.min(this.scrollOffset + this.viewportHeight, this.replicas.length);
      
      for (let i = this.scrollOffset; i < endIndex; i++) {
        const replica = this.replicas[i];
        const isSelected = i === this.selectedIndex;
        this.renderItem(replica, isSelected);
      }
      
      // Fill remaining space
      const remainingLines = this.viewportHeight - (endIndex - this.scrollOffset);
      for (let i = 0; i < remainingLines; i++) {
        console.log();
      }
    }
    
    // Status bar
    console.log(chalk.blue.bold('─'.repeat(67)));
    
    // Show scroll indicator and total
    if (this.replicas.length > 0) {
      const scrollInfo = `${this.selectedIndex + 1}/${this.replicas.length}`;
      const totalInfo = this.totalReplicas > this.replicas.length 
        ? ` (${this.totalReplicas} total)` 
        : '';
      console.log(chalk.gray(`Item: ${scrollInfo}${totalInfo}`));
      
      // Show loading indicator if near the end
      if (this.isLoadingMore) {
        console.log(chalk.yellow('Loading more replicas...'));
      }
    }
    
    // Help text
    const helpText = this.mode === 'explorer'
      ? '↑↓ Navigate │ Enter/. Details │ d Delete │ r Refresh │ q Exit'
      : '↑↓ Navigate │ Enter Select │ r Refresh │ q Exit';
    console.log(chalk.gray(helpText));
    
    // Show hint about more items
    if (this.totalReplicas > this.replicas.length) {
      console.log(chalk.cyan(`↓ Scroll down to load more (${this.replicas.length} of ${this.totalReplicas} loaded)`));
    }
  }

  private renderItem(replica: any, isSelected: boolean): void {
    const prefix = isSelected ? chalk.cyan.bold('▶ ') : '  ';
    const name = (replica.name || 'Unnamed Replica').substring(0, 35);
    const status = replica.status || 'active';
    const statusColor = status === 'active' ? chalk.green : chalk.yellow;
    const uuid = replica.uuid.substring(0, 8);
    
    let line = prefix;
    line += chalk.white(name.padEnd(36));
    line += statusColor(`[${status}]`.padEnd(10));
    line += chalk.gray(uuid + '...');
    
    console.log(line);
  }

  private async showDetails(): Promise<void> {
    const replica = this.replicas[this.selectedIndex];
    if (!replica) return;

    this.navigator.clearScreen();
    
    // Header
    console.log(chalk.blue.bold('┌─────────────────────────────────────────────────────────────────┐'));
    console.log(chalk.blue.bold('│') + chalk.white.bold(' REPLICA DETAILS'.padEnd(65)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('└─────────────────────────────────────────────────────────────────┘'));
    console.log();

    // Basic Information
    console.log(chalk.cyan.bold('Basic Information:'));
    console.log(chalk.white('  Name:        '), replica.name || 'N/A');
    console.log(chalk.white('  UUID:        '), replica.uuid);
    console.log(chalk.white('  Owner ID:    '), replica.ownerID || replica.owner_uuid || 'N/A');
    console.log(chalk.white('  Status:      '), replica.status || 'active');
    console.log(chalk.white('  Visibility:  '), replica.visibility || 'private');
    
    if (replica.slug) {
      console.log(chalk.white('  Slug:        '), replica.slug);
    }
    
    if (replica.description) {
      console.log(chalk.white('  Description: '), replica.description);
    }
    
    console.log();

    // Model Information
    if (replica.model) {
      console.log(chalk.cyan.bold('Model Configuration:'));
      console.log(chalk.white('  Model:       '), replica.model);
      if (replica.temperature !== undefined) {
        console.log(chalk.white('  Temperature: '), replica.temperature);
      }
      console.log();
    }

    // System Message (truncated if too long)
    if (replica.systemMessage) {
      console.log(chalk.cyan.bold('System Message:'));
      const lines = replica.systemMessage.split('\n').slice(0, 5);
      lines.forEach((line: string) => {
        const truncated = line.length > 60 ? line.substring(0, 57) + '...' : line;
        console.log(chalk.gray('  ' + truncated));
      });
      if (replica.systemMessage.split('\n').length > 5) {
        console.log(chalk.gray('  [...]'));
      }
      console.log();
    }

    // Timestamps
    if (replica.createdAt) {
      console.log(chalk.cyan.bold('Timestamps:'));
      console.log(chalk.white('  Created:     '), new Date(replica.createdAt).toLocaleString());
      if (replica.updatedAt) {
        console.log(chalk.white('  Updated:     '), new Date(replica.updatedAt).toLocaleString());
      }
    }

    console.log();
    console.log(chalk.blue.bold('─'.repeat(67)));
    console.log(chalk.gray('Press any key to return...'));
    
    await this.navigator.waitForKey();
  }

  private async loadReplicas(showLoading: boolean): Promise<void> {
    try {
      if (showLoading) {
        this.navigator.clearScreen();
        console.log(chalk.yellow('\n⏳ Loading replicas...'));
      }
      
      // Reset for fresh load
      this.currentPage = 1;
      this.replicas = [];
      
      const response = await ReplicasService.getV1Replicas(
        undefined, // ownerUuid
        undefined, // ownerId
        undefined, // page (deprecated)
        this.currentPage, // pageIndex
        this.pageSize // pageSize
      );
      
      this.replicas = response.items || [];
      this.totalReplicas = response.total || this.replicas.length;
      
      // Sort by name for better UX
      this.replicas.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      // Preserve selection if possible
      if (this.selectedIndex >= this.replicas.length) {
        this.selectedIndex = Math.max(0, this.replicas.length - 1);
      }
      
      // Reset scroll if needed
      if (this.scrollOffset > this.replicas.length - this.viewportHeight) {
        this.scrollOffset = Math.max(0, this.replicas.length - this.viewportHeight);
      }
    } catch (error: any) {
      this.navigator.clearScreen();
      console.error(chalk.red('\n❌ Failed to load replicas:'));
      
      if (error instanceof ApiError) {
        console.error(chalk.red(`Error: ${error.message}`));
        if (error.status) {
          console.error(chalk.red(`Status: ${error.status}`));
        }
      } else {
        console.error(chalk.red(`Error: ${error.message || error}`));
      }
      
      console.log(chalk.gray('\nPress any key to exit...'));
      await this.navigator.waitForKey();
      
      this.replicas = [];
      this.totalReplicas = 0;
    }
  }

  private async loadMoreReplicas(): Promise<void> {
    if (this.isLoadingMore || this.replicas.length >= this.totalReplicas) {
      return;
    }
    
    this.isLoadingMore = true;
    
    try {
      this.currentPage++;
      
      const response = await ReplicasService.getV1Replicas(
        undefined, // ownerUuid
        undefined, // ownerId
        undefined, // page (deprecated)
        this.currentPage, // pageIndex
        this.pageSize // pageSize
      );
      
      const newReplicas = response.items || [];
      
      // Remove duplicates (in case of overlap)
      const existingUuids = new Set(this.replicas.map(r => r.uuid));
      const uniqueNewReplicas = newReplicas.filter(r => !existingUuids.has(r.uuid));
      
      // Merge with existing replicas
      this.replicas = [...this.replicas, ...uniqueNewReplicas];
      
      // Sort all replicas
      this.replicas.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      // Update total if changed
      this.totalReplicas = response.total || this.totalReplicas;
      
    } catch (error: any) {
      // Silent fail for background loading
      if (process.env.NODE_ENV === 'development') {
        console.error(chalk.red('Failed to load more replicas:', error.message));
      }
    } finally {
      this.isLoadingMore = false;
    }
  }

  private getSelectedEntity(): SelectedEntity | null {
    const replica = this.replicas[this.selectedIndex];
    if (!replica) return null;

    return {
      type: 'replica',
      uuid: replica.uuid,
      name: replica.name,
      data: replica,
    };
  }

  private async deleteReplica(): Promise<boolean> {
    const replica = this.replicas[this.selectedIndex];
    if (!replica) return false;

    // Pause keyboard navigation for inquirer
    this.navigator.pause();
    this.navigator.showCursor();
    this.navigator.clearScreen();
    
    console.log(chalk.red.bold('\n⚠️  DELETE REPLICA WARNING ⚠️\n'));
    console.log(chalk.white(`You are about to delete the replica:`));
    console.log(chalk.yellow(`\n  Name: ${replica.name || 'Unnamed'}`));
    console.log(chalk.yellow(`  UUID: ${replica.uuid}`));
    console.log(chalk.yellow(`  Owner ID: ${replica.ownerID || replica.owner_uuid || 'N/A'}`));
    
    console.log(chalk.red.bold('\n⚠️  This action cannot be undone! ⚠️'));
    
    const { confirmDelete } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirmDelete',
      message: 'Are you sure you want to delete this replica?',
      default: false,
    });

    // Resume keyboard navigation after inquirer
    this.navigator.resume();
    this.navigator.hideCursor();

    if (!confirmDelete) {
      // Clear screen and return to main view
      this.navigator.clearScreen();
      return false;
    }

    try {
      this.navigator.clearScreen();
      console.log(chalk.yellow('\n🗑️  Deleting replica...'));
      
      await ReplicasService.deleteV1Replicas(replica.uuid);
      
      // Brief success message that will be visible during reload
      console.log(chalk.green('\n✅ Replica deleted successfully!'));
      
      // Small delay to let user see the success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error: any) {
      this.navigator.clearScreen();
      console.error(chalk.red('\n❌ Failed to delete replica:'));
      
      if (error instanceof ApiError) {
        console.error(chalk.red(`Error: ${error.message}`));
        if (error.status === 403) {
          console.error(chalk.red('You do not have permission to delete this replica.'));
        }
      } else {
        console.error(chalk.red(`Error: ${error.message || error}`));
      }
      
      console.log(chalk.gray('\nPress any key to continue...'));
      await this.navigator.waitForKey();
      
      return false;
    }
  }
}