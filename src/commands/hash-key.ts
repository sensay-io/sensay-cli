import { Command } from 'commander';
import { createHash } from 'node:crypto';
import chalk from 'chalk';

interface HashKeyOptions {
  algorithm?: string;
}

export function createTokenHash(message: string): string {
  return createHash('sha256').update(message).digest('hex');
}

export async function hashKeyCommand(key: string, options: HashKeyOptions = {}): Promise<void> {
  try {
    if (!key) {
      console.error(chalk.red('❌ No key provided'));
      process.exit(1);
    }

    const algorithm = options.algorithm || 'sha256';
    
    if (algorithm !== 'sha256') {
      console.error(chalk.red(`❌ Unsupported algorithm: ${algorithm}. Only sha256 is supported.`));
      process.exit(1);
    }

    const hash = createTokenHash(key);
    
    console.log(chalk.blue('🔐 Key Hash Generation\n'));
    console.log(chalk.gray(`Algorithm: ${algorithm}`));
    console.log(chalk.gray(`Input length: ${key.length} characters`));
    console.log(chalk.green(`\nHash: ${hash}`));
    
  } catch (error: any) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

export function setupHashKeyCommand(program: Command) {
  program
    .command('hash-key <key>')
    .alias('hk')
    .description('Generate a SHA-256 hash of the provided key')
    .option('-a, --algorithm <algo>', 'Hash algorithm (currently only sha256 supported)', 'sha256')
    .action(hashKeyCommand);
}