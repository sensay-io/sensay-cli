import readline from 'readline';
import chalk from 'chalk';

export class KeyboardNavigator {
  private rl: readline.Interface;
  private keyHandlers: Map<string, () => void> = new Map();

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Enable keypress events
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    readline.emitKeypressEvents(process.stdin);
  }

  onKey(key: string, handler: () => void): void {
    this.keyHandlers.set(key, handler);
  }

  async waitForKey(): Promise<string> {
    return new Promise((resolve) => {
      const onKeypress = (str: string, key: readline.Key) => {
        // Handle special keys
        if (key) {
          if (key.name === 'up') resolve('up');
          else if (key.name === 'down') resolve('down');
          else if (key.name === 'return' || key.name === 'enter') resolve('enter');
          else if (key.ctrl && key.name === 'c') {
            this.cleanup();
            process.exit(0);
          }
        }
        
        // Handle regular keys
        if (str) {
          if (str === 'q' || str === 'Q') resolve('quit');
          else if (str === 'r' || str === 'R') resolve('refresh');
          else if (str === '.') resolve('details');
          else if (str === '\u001b') resolve('escape'); // ESC key
        }
      };

      process.stdin.once('keypress', onKeypress);
    });
  }

  cleanup(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    this.rl.close();
  }

  hideCursor(): void {
    process.stdout.write('\x1B[?25l');
  }

  showCursor(): void {
    process.stdout.write('\x1B[?25h');
  }

  clearScreen(): void {
    console.clear();
  }

  moveCursor(x: number, y: number): void {
    process.stdout.write(`\x1B[${y};${x}H`);
  }
}