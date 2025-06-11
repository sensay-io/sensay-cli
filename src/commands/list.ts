import { Command } from 'commander';
import chalk from 'chalk';
import { 
  OpenAPI, 
  ApiError, 
  ReplicasService, 
  UsersService, 
  TrainingService 
} from '../generated/index';
import { ConfigManager } from '../config/manager';

interface ListOptions {
  organization?: string;
  user?: string;
  replica?: string;
}

export async function listCommand(options: ListOptions = {}): Promise<void> {
  console.log(chalk.blue('📊 Entity Overview\n'));

  try {
    // Load effective configuration
    const effectiveConfig = await ConfigManager.getEffectiveConfig();

    if (!effectiveConfig.apiKey) {
      console.error(chalk.red('❌ No API key found. Please run "sensay claim-key" first.'));
      process.exit(1);
    }

    // Configure the OpenAPI client
    OpenAPI.HEADERS = {
      'X-API-Version': '2025-03-25',
      'X-ORGANIZATION-SECRET': effectiveConfig.apiKey,
    };
    
    if (effectiveConfig.userId) {
      OpenAPI.HEADERS['X-USER-ID'] = effectiveConfig.userId;
    }

    // Determine what to list based on options
    if (options.organization) {
      await listOrganizationEntities(options.organization);
    } else if (options.user) {
      await listUserEntities(options.user);
    } else if (options.replica) {
      await listReplicaEntities(options.replica);
    } else {
      // Default: list current context
      await listCurrentContext(effectiveConfig);
    }

  } catch (error: any) {
    console.error(chalk.red('\n❌ List operation failed:'));
    
    if (error instanceof ApiError) {
      console.error(chalk.red(`Status: ${error.status}`));
      console.error(chalk.red(`Error: ${error.message}`));
      
      if (error.body) {
        const body = error.body as any;
        if (body.request_id) {
          console.error(chalk.gray(`Request ID: ${body.request_id}`));
        }
      }
    } else {
      console.error(chalk.red(`Error: ${error.message || error}`));
    }
    
    process.exit(1);
  }
}

async function listOrganizationEntities(organizationId: string): Promise<void> {
  console.log(chalk.cyan(`🏢 Organization: ${organizationId}\n`));
  
  // For now, user listing is not supported
  console.log(chalk.yellow('⚠️  User listing is currently not supported\n'));
  
  // List replicas (with their training data)
  await listReplicas();
}

async function listUserEntities(userId: string): Promise<void> {
  console.log(chalk.cyan(`👤 User: ${userId}\n`));
  
  try {
    // Get user info
    const user = await UsersService.getV1Users(userId);
    console.log(chalk.green(`✅ User found: ${user.name || 'Unnamed'} (${user.email || 'No email'})\n`));
  } catch (error: any) {
    console.log(chalk.red(`❌ User not found or inaccessible\n`));
  }
  
  // List replicas (with their training data)
  await listReplicas();
}

async function listReplicaEntities(replicaId: string): Promise<void> {
  console.log(chalk.cyan(`🤖 Replica: ${replicaId}\n`));
  
  try {
    // Get replica info
    const replica = await ReplicasService.getV1Replicas1(replicaId);
    console.log(chalk.green(`✅ Replica found: ${replica.name || 'Unnamed'}`));
    console.log(chalk.gray(`   Description: ${replica.shortDescription || 'No description'}`));
    console.log(chalk.gray(`   Model: ${replica.llm?.model || 'Unknown'}`));
  } catch (error: any) {
    console.log(chalk.red(`❌ Replica not found or inaccessible`));
  }
  
  // List training items for this replica
  await listTrainingItems(replicaId);
}

async function listCurrentContext(config: any): Promise<void> {
  console.log(chalk.cyan('📋 Current Context\n'));
  
  if (config.organizationId) {
    console.log(chalk.blue(`🏢 Organization: ${config.organizationId}`));
  }
  
  if (config.userId) {
    console.log(chalk.blue(`👤 User: ${config.userId}`));
  }
  
  console.log('');
  
  // List replicas (with their training data)
  await listReplicas();
}

async function listReplicas(): Promise<void> {
  try {
    console.log(chalk.blue('🤖 Replicas:'));
    const replicasResponse = await ReplicasService.getV1Replicas();
    
    if (replicasResponse.items && replicasResponse.items.length > 0) {
      console.log(chalk.green(`   Total: ${replicasResponse.items.length}\n`));
      
      // Show each replica with detailed information and its training data
      for (let index = 0; index < replicasResponse.items.length; index++) {
        const replica = replicasResponse.items[index];
        const model = replica.llm?.model || 'Unknown';
        const isPrivate = replica.private ? '🔒' : '🌐';
        const type = replica.type ? `[${replica.type}]` : '';
        
        console.log(chalk.cyan(`   ${index + 1}. ${replica.name} ${type}`));
        console.log(chalk.gray(`      UUID: ${replica.uuid}`));
        console.log(chalk.gray(`      Slug: ${replica.slug}`));
        console.log(chalk.gray(`      Model: ${model}`));
        console.log(chalk.gray(`      Visibility: ${isPrivate} ${replica.private ? 'Private' : 'Public'}`));
        
        if (replica.shortDescription) {
          console.log(chalk.gray(`      Description: ${replica.shortDescription}`));
        }
        
        if (replica.chat_history_count !== null && replica.chat_history_count !== undefined) {
          console.log(chalk.gray(`      Chat History: ${replica.chat_history_count} messages`));
        }
        
        // Show training data for this replica
        await listTrainingItemsForReplica(replica.uuid);
        
        console.log(''); // Empty line between replicas
      }
    } else {
      console.log(chalk.yellow('   No replicas found'));
    }
  } catch (error: any) {
    console.log(chalk.red('   ❌ Failed to fetch replicas'));
  }
}

async function listTrainingItemsForReplica(replicaUuid: string): Promise<void> {
  try {
    // Get all training entries with pagination for this specific replica
    let allEntries: any[] = [];
    let page = 1;
    
    while (true) {
      const trainingResponse = await TrainingService.getV1Training1(undefined, undefined, page.toString(), '100');
      
      if (!trainingResponse.success || !trainingResponse.items) {
        break;
      }
      
      // Filter by this replica
      const relevantEntries = trainingResponse.items.filter((item: any) => item.replica_uuid === replicaUuid);
      allEntries.push(...relevantEntries);
      
      // If we got fewer items than the limit, we've reached the end
      if (trainingResponse.items.length < 100) {
        break;
      }
      
      page++;
    }
    
    if (allEntries.length > 0) {
      console.log(chalk.blue(`      📚 Training Data: ${allEntries.length} items`));
      
      // Show breakdown by status (compact format)
      const byStatus = allEntries.reduce((acc: any, entry: any) => {
        const status = entry.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      // Sort statuses by priority and create compact display
      const statusPriority = ['ERR_FILE_PROCESSING', 'ERR_TEXT_PROCESSING', 'ERR_TEXT_TO_VECTOR', 'SYNC_ERROR', 'PROCESSING', 'READY', 'AWAITING_UPLOAD', 'SUPABASE_ONLY', 'BLANK'];
      const sortedStatuses = Object.entries(byStatus).sort(([a], [b]) => {
        const aIndex = statusPriority.indexOf(a);
        const bIndex = statusPriority.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      
      const statusDisplay = sortedStatuses
        .map(([status, count]) => `${status}: ${count}`)
        .join(' | ');
      console.log(chalk.gray(`         Status: ${statusDisplay}`));
      
      // Show breakdown by type (compact format)
      const byType = allEntries.reduce((acc: any, entry: any) => {
        const type = entry.type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      const typeDisplay = Object.entries(byType)
        .map(([type, count]) => `${type}: ${count}`)
        .join(' | ');
      console.log(chalk.gray(`         Types: ${typeDisplay}`));
      
    } else {
      console.log(chalk.gray('      📚 Training Data: No training data'));
    }
  } catch (error: any) {
    console.log(chalk.red('      📚 Training Data: ❌ Failed to fetch'));
  }
}

async function listTrainingItems(replicaId?: string): Promise<void> {
  try {
    console.log(chalk.blue('\n📚 Training Data:'));
    
    // Get all training entries with pagination
    let allEntries: any[] = [];
    let page = 1;
    
    while (true) {
      const trainingResponse = await TrainingService.getV1Training1(undefined, undefined, page.toString(), '100');
      
      if (!trainingResponse.success || !trainingResponse.items) {
        break;
      }
      
      // Filter by replica if specified
      const relevantEntries = replicaId 
        ? trainingResponse.items.filter((item: any) => item.replica_uuid === replicaId)
        : trainingResponse.items;
      
      allEntries.push(...relevantEntries);
      
      // If we got fewer items than the limit, we've reached the end
      if (trainingResponse.items.length < 100) {
        break;
      }
      
      page++;
    }
    
    if (allEntries.length > 0) {
      console.log(chalk.green(`   Total: ${allEntries.length}`));
      
      // Show breakdown by status
      const byStatus = allEntries.reduce((acc: any, entry: any) => {
        const status = entry.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      // Sort statuses by priority (errors first, then processing, then ready)
      const statusPriority = ['ERR_FILE_PROCESSING', 'ERR_TEXT_PROCESSING', 'ERR_TEXT_TO_VECTOR', 'SYNC_ERROR', 'PROCESSING', 'READY', 'AWAITING_UPLOAD', 'SUPABASE_ONLY', 'BLANK'];
      const sortedStatuses = Object.entries(byStatus).sort(([a], [b]) => {
        const aIndex = statusPriority.indexOf(a);
        const bIndex = statusPriority.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      
      sortedStatuses.forEach(([status, count]) => {
        let color = chalk.gray;
        if (status === 'READY') color = chalk.green;
        else if (status === 'PROCESSING') color = chalk.blue;
        else if (status.startsWith('ERR_') || status === 'SYNC_ERROR') color = chalk.red;
        else if (status === 'AWAITING_UPLOAD' || status === 'SUPABASE_ONLY') color = chalk.yellow;
        
        console.log(color(`   ${status}: ${count}`));
      });
      
      // Show breakdown by type
      console.log(chalk.blue('\n   By Type:'));
      const byType = allEntries.reduce((acc: any, entry: any) => {
        const type = entry.type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(byType).forEach(([type, count]) => {
        console.log(chalk.gray(`   ${type}: ${count}`));
      });
      
    } else {
      console.log(chalk.yellow('   No training data found'));
    }
  } catch (error: any) {
    console.log(chalk.red('   ❌ Failed to fetch training data'));
  }
}

export function setupListCommand(program: Command): void {
  program
    .command('list')
    .description('List entities and their counts')
    .option('-o, --organization <id>', 'List entities for a specific organization')
    .option('-u, --user <id>', 'List entities for a specific user')
    .option('-r, --replica <id>', 'List entities for a specific replica')
    .action((options) => {
      return listCommand(options);
    });
}