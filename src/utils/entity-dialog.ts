import chalk from 'chalk';
import inquirer from 'inquirer';
import { ReplicasService, KnowledgeBaseService, ApiError } from '../generated/index';
import { KeyboardNavigator } from './keyboard-navigator';

export interface EntityDialogOptions {
  mode: 'select' | 'explorer';
}

export interface SelectedEntity {
  type: 'replica' | 'knowledge-base';
  uuid: string;
  name: string;
  data: any;
  parentUuid?: string;
}

interface NavigationLevel {
  type: 'replicas' | 'knowledge-base';
  items: any[];
  selectedIndex: number;
  scrollOffset: number;
  currentPage: number;
  totalItems: number;
  parentUuid?: string;
  parentName?: string;
}

export class EntityDialog {
  private mode: 'select' | 'explorer';
  private navigator: KeyboardNavigator;
  private viewportHeight: number = 15;
  private pageSize: number = 50;
  private isLoadingMore: boolean = false;
  
  // Navigation state
  private navigationStack: NavigationLevel[] = [];
  private currentLevel!: NavigationLevel; // Will be initialized in show()
  
  // Legacy properties for compatibility
  private get replicas() { return this.currentLevel?.items || []; }
  private get selectedIndex() { return this.currentLevel?.selectedIndex || 0; }
  private set selectedIndex(value: number) { if (this.currentLevel) this.currentLevel.selectedIndex = value; }
  private get scrollOffset() { return this.currentLevel?.scrollOffset || 0; }
  private set scrollOffset(value: number) { if (this.currentLevel) this.currentLevel.scrollOffset = value; }
  private get currentPage() { return this.currentLevel?.currentPage || 1; }
  private set currentPage(value: number) { if (this.currentLevel) this.currentLevel.currentPage = value; }
  private get totalReplicas() { return this.currentLevel?.totalItems || 0; }
  private set totalReplicas(value: number) { if (this.currentLevel) this.currentLevel.totalItems = value; }

  constructor(private options: EntityDialogOptions) {
    this.mode = options.mode;
    this.navigator = new KeyboardNavigator();
  }

  async show(): Promise<SelectedEntity | null> {
    this.navigator.hideCursor();
    
    try {
      // Initialize with replicas level
      this.currentLevel = {
        type: 'replicas',
        items: [],
        selectedIndex: 0,
        scrollOffset: 0,
        currentPage: 1,
        totalItems: 0
      };
      this.navigationStack = [this.currentLevel];
      
      // Load initial data
      await this.loadCurrentLevel(true);

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
            if (this.mode === 'explorer') {
              // Navigate deeper if possible
              const navigated = await this.navigateDeeper();
              if (!navigated) {
                await this.showDetails();
              }
            } else {
              return this.getSelectedEntity();
            }
            break;
            
          case 'details':
            if (this.mode === 'explorer') {
              await this.showDetails();
            }
            break;
            
          case 'escape':
            // Go back one level
            if (this.navigationStack.length > 1) {
              this.navigateBack();
            } else {
              return null;
            }
            break;
            
          case 'refresh':
            await this.loadCurrentLevel(false);
            break;
            
          case 'delete':
            if (this.mode === 'explorer' && this.currentLevel.items.length > 0) {
              const deleted = await this.deleteCurrentItem();
              if (deleted) {
                await this.loadCurrentLevel(false);
              }
            }
            break;
            
          case 'delete-all':
            if (this.mode === 'explorer' && this.currentLevel.type === 'replicas' && this.replicas.length > 0) {
              const deletedCount = await this.deleteAllReplicas();
              if (deletedCount > 0) {
                await this.loadCurrentLevel(false);
              }
            }
            break;
            
          case 'quit':
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
      
      // Check if we need to load more items
      if (this.selectedIndex >= this.currentLevel.items.length - 5 && 
          this.currentLevel.items.length < this.currentLevel.totalItems && 
          !this.isLoadingMore) {
        this.loadMoreItems();
      }
    }
  }

  private render(): void {
    this.navigator.clearScreen();
    
    // Header
    console.log(chalk.blue.bold('┌─────────────────────────────────────────────────────────────────┐'));
    console.log(chalk.blue.bold('│') + chalk.white.bold(' SENSAY EXPLORER'.padEnd(65)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('├─────────────────────────────────────────────────────────────────┤'));
    const breadcrumb = this.getBreadcrumb();
    console.log(chalk.blue.bold('│') + chalk.gray(` ${breadcrumb}`.padEnd(65)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('└─────────────────────────────────────────────────────────────────┘'));
    
    // Content area
    if (this.currentLevel.items.length === 0) {
      console.log();
      if (this.currentLevel.type === 'replicas') {
        console.log(chalk.yellow('  No replicas found.'));
        console.log();
        console.log(chalk.gray('  Create replicas using "sensay simple-organization-setup"'));
      } else if (this.currentLevel.type === 'knowledge-base') {
        console.log(chalk.yellow('  No knowledge base items found.'));
        console.log();
        console.log(chalk.gray('  Add training data to this replica to see items here.'));
      }
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
    let helpText = '';
    if (this.mode === 'explorer') {
      if (this.currentLevel.type === 'replicas') {
        helpText = '↑↓ Navigate │ Enter Go deeper │ . Details │ d Delete │ D Delete ALL │ r Refresh │ q Exit';
      } else {
        helpText = '↑↓ Navigate │ . Details │ d Delete │ r Refresh │ ESC Back │ q Exit';
      }
    } else {
      helpText = '↑↓ Navigate │ Enter Select │ r Refresh │ q Exit';
    }
    console.log(chalk.gray(helpText));
    
    // Show hint about more items
    if (this.totalReplicas > this.replicas.length) {
      console.log(chalk.cyan(`↓ Scroll down to load more (${this.replicas.length} of ${this.totalReplicas} loaded)`));
    }
  }

  private renderItem(item: any, isSelected: boolean): void {
    const prefix = isSelected ? chalk.cyan.bold('▶ ') : '  ';
    
    if (this.currentLevel.type === 'replicas') {
      const name = (item.name || 'Unnamed Replica').substring(0, 35);
      const status = item.status || 'active';
      const statusColor = status === 'active' ? chalk.green : chalk.yellow;
      const uuid = item.uuid.substring(0, 8);
      
      let line = prefix;
      line += chalk.white(name.padEnd(36));
      line += statusColor(`[${status}]`.padEnd(10));
      line += chalk.gray(uuid + '...');
      
      console.log(line);
    } else if (this.currentLevel.type === 'knowledge-base') {
      const type = item.type || 'unknown';
      const status = item.status || 'UNKNOWN';
      let displayName = '';
      
      // Build display name based on type
      if (type === 'file' && item.file?.filename) {
        displayName = item.file.filename;
      } else if (type === 'website' && item.website?.url) {
        displayName = item.website.url.substring(0, 30);
      } else if (type === 'youtube' && item.youtube?.title) {
        displayName = item.youtube.title;
      } else if (type === 'text') {
        const preview = (item.rawText || '').replace(/\n/g, ' ').substring(0, 30);
        displayName = preview || 'Text content';
      } else {
        displayName = `${type} #${item.id}`;
      }
      
      displayName = displayName.substring(0, 35);
      
      // Status color coding
      let statusColor = chalk.gray;
      if (status === 'READY') statusColor = chalk.green;
      else if (status === 'PROCESSING' || status === 'FILE_UPLOADED' || status === 'RAW_TEXT') statusColor = chalk.yellow;
      else if (status === 'UNPROCESSABLE' || status.startsWith('ERR')) statusColor = chalk.red;
      
      let line = prefix;
      line += chalk.white(displayName.padEnd(36));
      line += statusColor(`[${status}]`.padEnd(15));
      line += chalk.gray(type);
      
      console.log(line);
    }
  }

  private async showDetails(): Promise<void> {
    const item = this.currentLevel.items[this.selectedIndex];
    if (!item) return;

    if (this.currentLevel.type === 'replicas') {
      await this.showReplicaDetails(item);
    } else if (this.currentLevel.type === 'knowledge-base') {
      await this.showKnowledgeBaseDetails(item);
    }
  }

  private async showReplicaDetails(replica: any): Promise<void> {
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

  private async showKnowledgeBaseDetails(item: any): Promise<void> {
    this.navigator.clearScreen();
    
    // Header
    console.log(chalk.blue.bold('┌─────────────────────────────────────────────────────────────────┐'));
    console.log(chalk.blue.bold('│') + chalk.white.bold(' KNOWLEDGE BASE ITEM DETAILS'.padEnd(65)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('└─────────────────────────────────────────────────────────────────┘'));
    console.log();

    // Basic Information
    console.log(chalk.cyan.bold('Basic Information:'));
    console.log(chalk.white('  ID:          '), item.id || 'N/A');
    console.log(chalk.white('  Type:        '), item.type || 'N/A');
    console.log(chalk.white('  Status:      '), item.status || 'N/A');
    
    console.log();

    // Type-specific information
    if (item.type === 'file' && item.file) {
      console.log(chalk.cyan.bold('File Information:'));
      console.log(chalk.white('  Filename:    '), item.file.filename || 'N/A');
      console.log(chalk.white('  Size:        '), item.file.sizeBytes ? `${(item.file.sizeBytes / 1024 / 1024).toFixed(2)} MB` : 'N/A');
      console.log(chalk.white('  Type:        '), item.file.mimeType || 'N/A');
      console.log();
    } else if (item.type === 'website' && item.website) {
      console.log(chalk.cyan.bold('Website Information:'));
      console.log(chalk.white('  URL:         '), item.website.url || 'N/A');
      console.log(chalk.white('  Title:       '), item.website.title || 'N/A');
      console.log();
    } else if (item.type === 'youtube' && item.youtube) {
      console.log(chalk.cyan.bold('YouTube Information:'));
      console.log(chalk.white('  Title:       '), item.youtube.title || 'N/A');
      console.log(chalk.white('  Channel:     '), item.youtube.channelTitle || 'N/A');
      console.log(chalk.white('  Duration:    '), item.youtube.duration || 'N/A');
      console.log(chalk.white('  URL:         '), item.youtube.url || 'N/A');
      console.log();
    }

    // Content preview (if text type or has raw text)
    if (item.rawText) {
      console.log(chalk.cyan.bold('Content Preview:'));
      const preview = item.rawText.substring(0, 200).replace(/\n/g, ' ');
      console.log(chalk.gray('  ' + preview + (item.rawText.length > 200 ? '...' : '')));
      console.log();
    }

    // Processing Information
    if (item.generatedFacts || item.generatedChunks) {
      console.log(chalk.cyan.bold('Processing Information:'));
      if (item.generatedFacts) {
        console.log(chalk.white('  Facts:       '), `${item.generatedFacts} generated`);
      }
      if (item.generatedChunks) {
        console.log(chalk.white('  Chunks:      '), `${item.generatedChunks} created`);
      }
      console.log();
    }

    // Timestamps
    if (item.createdAt || item.updatedAt) {
      console.log(chalk.cyan.bold('Timestamps:'));
      if (item.createdAt) {
        console.log(chalk.white('  Created:     '), new Date(item.createdAt).toLocaleString());
      }
      if (item.updatedAt) {
        console.log(chalk.white('  Updated:     '), new Date(item.updatedAt).toLocaleString());
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
      this.currentLevel.currentPage = 1;
      this.currentLevel.items = [];
      
      const response = await ReplicasService.getV1Replicas(
        undefined, // ownerUuid
        undefined, // ownerId
        undefined, // page (deprecated)
        this.currentPage, // pageIndex
        this.pageSize // pageSize
      );
      
      this.currentLevel.items = response.items || [];
      this.currentLevel.totalItems = response.total || this.currentLevel.items.length;
      
      // Sort by name for better UX
      this.currentLevel.items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
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
      
      this.currentLevel.items = [];
      this.currentLevel.totalItems = 0;
    }
  }

  private async loadMoreItems(): Promise<void> {
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
      
      // Merge with existing items
      this.currentLevel.items = [...this.currentLevel.items, ...uniqueNewReplicas];
      
      // Sort all items
      this.currentLevel.items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
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

  private async deleteAllReplicas(): Promise<number> {
    // Pause keyboard navigation for inquirer
    this.navigator.pause();
    this.navigator.showCursor();
    this.navigator.clearScreen();
    
    console.log(chalk.red.bold('\n⚠️  DELETE ALL REPLICAS WARNING ⚠️\n'));
    console.log(chalk.white(`You are about to delete ALL ${chalk.red.bold(this.totalReplicas.toString())} replicas!`));
    
    if (this.totalReplicas > this.replicas.length) {
      console.log(chalk.yellow(`\nNote: ${this.totalReplicas - this.replicas.length} replicas are not loaded yet.`));
      console.log(chalk.yellow('The operation will delete ALL replicas, including those not displayed.'));
    }
    
    console.log(chalk.red.bold('\n⚠️  THIS ACTION CANNOT BE UNDONE! ⚠️'));
    console.log(chalk.red.bold('⚠️  ALL YOUR REPLICAS WILL BE PERMANENTLY DELETED! ⚠️'));
    
    // First confirmation
    const { confirmFirst } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirmFirst',
      message: chalk.red('Are you ABSOLUTELY SURE you want to delete ALL replicas?'),
      default: false,
    });

    if (!confirmFirst) {
      this.navigator.resume();
      this.navigator.hideCursor();
      this.navigator.clearScreen();
      return 0;
    }

    // Second confirmation with typing
    console.log(chalk.red.bold('\n⚠️  FINAL CONFIRMATION ⚠️'));
    const { confirmText } = await inquirer.prompt({
      type: 'input',
      name: 'confirmText',
      message: chalk.red('Type "deleteeverything" to confirm deletion of all replicas:'),
      validate: (input: string) => {
        if (input === 'deleteeverything') {
          return true;
        }
        return 'You must type exactly "deleteeverything" to confirm';
      }
    });

    // Resume keyboard navigation after inquirer
    this.navigator.resume();
    this.navigator.hideCursor();

    if (confirmText !== 'deleteeverything') {
      this.navigator.clearScreen();
      return 0;
    }

    // Proceed with deletion
    this.navigator.clearScreen();
    console.log(chalk.yellow('\n🗑️  Deleting all replicas...'));
    console.log(chalk.gray('This may take a while...\n'));

    let deletedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      // First, we need to load ALL replicas if we haven't already
      if (this.replicas.length < this.totalReplicas) {
        console.log(chalk.gray('Loading all replicas...'));
        
        // Load all pages
        const allReplicas: any[] = [...this.replicas];
        let currentPage = Math.ceil(this.replicas.length / this.pageSize) + 1;
        
        while (allReplicas.length < this.totalReplicas) {
          try {
            const response = await ReplicasService.getV1Replicas(
              undefined,
              undefined,
              undefined,
              currentPage,
              this.pageSize
            );
            
            const newReplicas = response.items || [];
            const existingUuids = new Set(allReplicas.map(r => r.uuid));
            const uniqueNewReplicas = newReplicas.filter(r => !existingUuids.has(r.uuid));
            allReplicas.push(...uniqueNewReplicas);
            
            currentPage++;
          } catch (error) {
            console.error(chalk.red('Failed to load all replicas'));
            break;
          }
        }
        
        this.currentLevel.items = allReplicas;
      }

      // Now delete each replica
      for (let i = 0; i < this.replicas.length; i++) {
        const replica = this.replicas[i];
        const progress = `[${i + 1}/${this.replicas.length}]`;
        
        try {
          process.stdout.write(chalk.gray(`${progress} Deleting ${replica.name || 'Unnamed'}... `));
          await ReplicasService.deleteV1Replicas(replica.uuid);
          deletedCount++;
          process.stdout.write(chalk.green('✓\n'));
        } catch (error: any) {
          failedCount++;
          process.stdout.write(chalk.red('✗\n'));
          
          if (error instanceof ApiError && error.status === 403) {
            errors.push(`${replica.name || replica.uuid}: No permission`);
          } else {
            errors.push(`${replica.name || replica.uuid}: ${error.message || 'Unknown error'}`);
          }
        }
      }

      // Show summary
      console.log(chalk.green(`\n✅ Deleted ${deletedCount} replicas`));
      
      if (failedCount > 0) {
        console.log(chalk.red(`❌ Failed to delete ${failedCount} replicas`));
        
        if (errors.length > 0 && errors.length <= 5) {
          console.log(chalk.red('\nErrors:'));
          errors.forEach(err => console.log(chalk.red(`  - ${err}`)));
        } else if (errors.length > 5) {
          console.log(chalk.red(`\nShowing first 5 errors:`));
          errors.slice(0, 5).forEach(err => console.log(chalk.red(`  - ${err}`)));
          console.log(chalk.red(`  ... and ${errors.length - 5} more`));
        }
      }

      // Brief delay to see the results
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return deletedCount;

    } catch (error: any) {
      this.navigator.clearScreen();
      console.error(chalk.red('\n❌ Failed to delete replicas:'));
      console.error(chalk.red(`Error: ${error.message || error}`));
      
      console.log(chalk.gray('\nPress any key to continue...'));
      await this.navigator.waitForKey();
      
      return 0;
    }
  }

  private getBreadcrumb(): string {
    const parts = this.navigationStack.map((level, index) => {
      if (level.type === 'replicas') {
        return 'Replicas';
      } else if (level.type === 'knowledge-base') {
        return `${level.parentName || 'Replica'} > Knowledge Base`;
      }
      return level.type;
    });
    return parts.join(' > ');
  }

  private async navigateDeeper(): Promise<boolean> {
    const currentItem = this.currentLevel.items[this.selectedIndex];
    if (!currentItem) return false;

    if (this.currentLevel.type === 'replicas') {
      // Navigate to knowledge base items
      const newLevel: NavigationLevel = {
        type: 'knowledge-base',
        items: [],
        selectedIndex: 0,
        scrollOffset: 0,
        currentPage: 1,
        totalItems: 0,
        parentUuid: currentItem.uuid,
        parentName: currentItem.name
      };
      
      this.navigationStack.push(newLevel);
      this.currentLevel = newLevel;
      
      await this.loadCurrentLevel(true);
      return true;
    }
    
    // Can't navigate deeper from knowledge base
    return false;
  }

  private navigateBack(): void {
    if (this.navigationStack.length > 1) {
      this.navigationStack.pop();
      this.currentLevel = this.navigationStack[this.navigationStack.length - 1];
    }
  }

  private async loadCurrentLevel(showLoading: boolean): Promise<void> {
    if (this.currentLevel.type === 'replicas') {
      await this.loadReplicas(showLoading);
    } else if (this.currentLevel.type === 'knowledge-base') {
      await this.loadKnowledgeBase(showLoading);
    }
  }

  private async loadKnowledgeBase(showLoading: boolean): Promise<void> {
    try {
      if (showLoading) {
        this.navigator.clearScreen();
        console.log(chalk.yellow('\n⏳ Loading knowledge base items...'));
      }
      
      const parentUuid = this.currentLevel.parentUuid;
      if (!parentUuid) {
        throw new Error('Parent replica UUID is required');
      }
      
      // Reset for fresh load
      this.currentLevel.currentPage = 1;
      this.currentLevel.items = [];
      
      const response = await KnowledgeBaseService.getV1ReplicasKnowledgeBase(
        parentUuid,
        undefined, // status
        undefined, // type
        this.currentLevel.currentPage, // page
        this.pageSize, // pageSize
        'createdAt', // sortBy
        'desc' // sortOrder
      );
      
      this.currentLevel.items = response.items || [];
      this.currentLevel.totalItems = response.total || this.currentLevel.items.length;
      
      // Sort by creation date (newest first)
      this.currentLevel.items.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      
      // Preserve selection if possible
      if (this.currentLevel.selectedIndex >= this.currentLevel.items.length) {
        this.currentLevel.selectedIndex = Math.max(0, this.currentLevel.items.length - 1);
      }
      
      // Reset scroll if needed
      if (this.currentLevel.scrollOffset > this.currentLevel.items.length - this.viewportHeight) {
        this.currentLevel.scrollOffset = Math.max(0, this.currentLevel.items.length - this.viewportHeight);
      }
    } catch (error: any) {
      this.navigator.clearScreen();
      console.error(chalk.red('\n❌ Failed to load knowledge base items:'));
      
      if (error instanceof ApiError) {
        console.error(chalk.red(`Error: ${error.message}`));
        if (error.status) {
          console.error(chalk.red(`Status: ${error.status}`));
        }
      } else {
        console.error(chalk.red(`Error: ${error.message || error}`));
      }
      
      console.log(chalk.gray('\nPress any key to go back...'));
      await this.navigator.waitForKey();
      
      // Go back to replicas
      this.navigateBack();
    }
  }

  private async deleteCurrentItem(): Promise<boolean> {
    if (this.currentLevel.type === 'replicas') {
      return await this.deleteReplica();
    } else if (this.currentLevel.type === 'knowledge-base') {
      return await this.deleteKnowledgeBaseItem();
    }
    return false;
  }

  private async deleteKnowledgeBaseItem(): Promise<boolean> {
    const item = this.currentLevel.items[this.selectedIndex];
    if (!item) return false;

    // Pause keyboard navigation for inquirer
    this.navigator.pause();
    this.navigator.showCursor();
    this.navigator.clearScreen();
    
    console.log(chalk.red.bold('\n⚠️  DELETE KNOWLEDGE BASE ITEM WARNING ⚠️\n'));
    console.log(chalk.white(`You are about to delete the knowledge base item:`));
    console.log(chalk.yellow(`\n  Type: ${item.type || 'Unknown'}`));
    console.log(chalk.yellow(`  Status: ${item.status || 'Unknown'}`));
    console.log(chalk.yellow(`  ID: ${item.id}`));
    if (item.file?.filename) {
      console.log(chalk.yellow(`  File: ${item.file.filename}`));
    }
    if (item.website?.url) {
      console.log(chalk.yellow(`  URL: ${item.website.url}`));
    }
    
    console.log(chalk.red.bold('\n⚠️  This action cannot be undone! ⚠️'));
    
    const { confirmDelete } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirmDelete',
      message: 'Are you sure you want to delete this knowledge base item?',
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
      console.log(chalk.yellow('\n🗑️  Deleting knowledge base item...'));
      
      await KnowledgeBaseService.deleteV1ReplicasKnowledgeBase(
        item.id,
        this.currentLevel.parentUuid!
      );
      
      // Brief success message that will be visible during reload
      console.log(chalk.green('\n✅ Knowledge base item deleted successfully!'));
      
      // Small delay to let user see the success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error: any) {
      this.navigator.clearScreen();
      console.error(chalk.red('\n❌ Failed to delete knowledge base item:'));
      
      if (error instanceof ApiError) {
        console.error(chalk.red(`Error: ${error.message}`));
        if (error.status === 403) {
          console.error(chalk.red('You do not have permission to delete this item.'));
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