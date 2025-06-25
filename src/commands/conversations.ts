import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { 
  OpenAPI, 
  ApiError, 
  ConversationsService 
} from '../generated/index';
import { ConfigManager } from '../config/manager';

interface ConversationsOptions {
  replicaId?: string;
  conversationId?: string;
  output?: string;
  mentionsOnly?: boolean;
  limit?: number;
  nonInteractive?: boolean;
}

export async function conversationsCommand(options: ConversationsOptions = {}): Promise<void> {
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

    // Get replica ID from options or config
    let replicaId = options.replicaId;
    if (!replicaId) {
      const { projectConfig } = await ConfigManager.getMergedConfig();
      replicaId = projectConfig.replicaId;
      
      if (!replicaId) {
        console.error(chalk.red('❌ No replica ID specified. Use --replica-id option or set replicaId in config.'));
        process.exit(1);
      }
    }

    if (options.conversationId) {
      // Query specific conversation for mentions
      await queryConversationMentions(replicaId, options.conversationId, options);
    } else {
      // List all conversations for the replica
      await listConversations(replicaId, options);
    }

  } catch (error: any) {
    console.error(chalk.red('\n❌ Conversations query failed:'));
    
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

async function listConversations(replicaId: string, options: ConversationsOptions): Promise<void> {
  console.log(chalk.blue(`📋 Conversations for Replica: ${replicaId}\n`));
  
  const response = await ConversationsService.getV1ReplicasConversations1(replicaId);
  
  if (!response.items || response.items.length === 0) {
    console.log(chalk.yellow('No conversations found.'));
    return;
  }

  console.log(chalk.green(`Total conversations: ${response.total}\n`));
  
  const conversationData = {
    replicaId,
    totalConversations: response.total,
    conversations: response.items.map((conv, index) => ({
      index: index + 1,
      uuid: conv.uuid,
      source: conv.source,
      messageCount: conv.messageCount,
      assistantReplyCount: conv.assistantReplyCount,
      firstMessageAt: conv.firstMessageAt,
      lastMessageAt: conv.lastMessageAt,
      lastReplicaReplyAt: conv.lastReplicaReplyAt,
      conversationName: conv.conversationName,
      conversationImageURL: conv.conversationImageURL
    }))
  };

  // Display conversations
  response.items.forEach((conv, index) => {
    console.log(chalk.cyan(`${index + 1}. ${conv.conversationName || 'Unnamed Conversation'}`));
    console.log(chalk.gray(`   UUID: ${conv.uuid}`));
    console.log(chalk.gray(`   Source: ${conv.source}`));
    console.log(chalk.gray(`   Messages: ${conv.messageCount} (${conv.assistantReplyCount} assistant replies)`));
    
    if (conv.firstMessageAt) {
      console.log(chalk.gray(`   First message: ${new Date(conv.firstMessageAt).toLocaleString()}`));
    }
    if (conv.lastReplicaReplyAt) {
      console.log(chalk.gray(`   Last reply: ${new Date(conv.lastReplicaReplyAt).toLocaleString()}`));
    }
    console.log();
  });

  // Interactive prompt to query mentions if not in non-interactive mode
  if (!options.nonInteractive && response.items.length > 0) {
    const inquirer = await import('inquirer');
    
    const { shouldQueryMentions } = await inquirer.default.prompt({
      type: 'confirm',
      name: 'shouldQueryMentions',
      message: 'Would you like to query mentions for a specific conversation?',
      default: false
    });

    if (shouldQueryMentions) {
      const choices = response.items.map((conv, index) => ({
        name: `${index + 1}. ${conv.conversationName || 'Unnamed Conversation'} (${conv.messageCount} messages)`,
        value: conv.uuid
      }));

      const { selectedConversation } = await inquirer.default.prompt({
        type: 'list',
        name: 'selectedConversation',
        message: 'Select a conversation:',
        choices
      });

      const { shouldSaveToFile } = await inquirer.default.prompt({
        type: 'confirm',
        name: 'shouldSaveToFile',
        message: 'Save mentions to file?',
        default: false
      });

      let outputPath;
      if (shouldSaveToFile) {
        const { filePath } = await inquirer.default.prompt({
          type: 'input',
          name: 'filePath',
          message: 'Output file path:',
          default: `mentions-${selectedConversation}.json`
        });
        outputPath = filePath;
      }

      console.log(''); // Add spacing
      await queryConversationMentions(replicaId, selectedConversation, { ...options, output: outputPath });
    }
  }

  // Save to file if output specified
  if (options.output) {
    await saveToFile(conversationData, options.output);
    console.log(chalk.green(`✅ Conversations saved to: ${options.output}`));
  }
}

async function queryConversationMentions(replicaId: string, conversationId: string, options: ConversationsOptions): Promise<void> {
  console.log(chalk.blue(`🔍 Mentions for Conversation: ${conversationId}\n`));
  
  const limit = options.limit || 50;
  const response = await ConversationsService.getV1ReplicasConversationsMentions(
    replicaId, 
    conversationId, 
    limit
  );
  
  if (!response.items || response.items.length === 0) {
    console.log(chalk.yellow('No mentions found.'));
    return;
  }

  console.log(chalk.green(`Found ${response.items.length} mention items\n`));
  
  const mentionData = {
    replicaId,
    conversationId,
    totalItems: response.items.length,
    mentions: response.items.map((item, index) => {
      if (item.type === 'message') {
        return {
          index: index + 1,
          type: 'message',
          uuid: item.uuid,
          createdAt: item.createdAt,
          content: item.content,
          role: item.role,
          senderName: item.senderName,
          source: item.source
        };
      } else {
        return {
          index: index + 1,
          type: 'placeholder',
          count: item.count
        };
      }
    })
  };

  // Display mentions
  response.items.forEach((item, index) => {
    if (item.type === 'message') {
      const roleColor = item.role === 'assistant' ? chalk.blue : chalk.green;
      console.log(roleColor(`${index + 1}. [${item.role.toUpperCase()}] ${item.senderName || 'Unknown'}`));
      console.log(chalk.gray(`   Time: ${new Date(item.createdAt).toLocaleString()}`));
      console.log(chalk.gray(`   Source: ${item.source}`));
      console.log(chalk.white(`   Content: ${item.content}`));
    } else {
      console.log(chalk.yellow(`${index + 1}. [PLACEHOLDER] ${item.count} messages collapsed`));
    }
    console.log();
  });

  // Save to file if output specified
  if (options.output) {
    await saveToFile(mentionData, options.output);
    console.log(chalk.green(`✅ Mentions saved to: ${options.output}`));
  }
}

async function saveToFile(data: any, outputPath: string): Promise<void> {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  await fs.ensureDir(dir);
  
  // Determine format based on file extension
  const ext = path.extname(outputPath).toLowerCase();
  
  if (ext === '.json') {
    await fs.writeJSON(outputPath, data, { spaces: 2 });
  } else {
    // Default to JSON format with .json extension
    const jsonPath = outputPath.endsWith('.json') ? outputPath : `${outputPath}.json`;
    await fs.writeJSON(jsonPath, data, { spaces: 2 });
  }
}

export function setupConversationsCommand(program: Command): void {
  const cmd = program
    .command('conversations')
    .description('Query replica conversations and mentions')
    .option('-r, --replica-id <id>', 'replica ID to query conversations for')
    .option('-c, --conversation-id <id>', 'specific conversation ID to query mentions')
    .option('-o, --output <path>', 'output file path in JSON format')
    .option('-m, --mentions-only', 'show only mentions, requires conversation-id')
    .option('-l, --limit <number>', 'limit number of results (default: 50)', parseInt)
    .action((options) => {
      return conversationsCommand(options);
    });

  // Configure help in wget style for this command
  cmd.configureHelp({
    formatHelp: (cmd, helper) => {
      const termWidth = helper.padWidth(cmd, helper);
      
      let str = `Sensay CLI 1.0.1 - Query Conversations
Usage: ${helper.commandUsage(cmd)}

Query and retrieve conversations and mentions for a replica. You can list
all conversations for a replica, or get specific mentions within a conversation.

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
  sensay conversations
  sensay conversations -r replica-123
  sensay conversations --replica-id replica-123 --output conversations.json
  sensay conversations -c conv-456 --mentions-only
  sensay conversations -r replica-123 -l 100

Use --mentions-only with --conversation-id to get specific mentions within
a conversation.`;

      return str;
    }
  });
}