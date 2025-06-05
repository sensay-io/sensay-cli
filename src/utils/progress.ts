import ora, { Ora } from 'ora';
import chalk from 'chalk';

export class ProgressManager {
  private spinners: Map<string, Ora> = new Map();

  createSpinner(id: string, text: string): Ora {
    const spinner = ora(text).start();
    this.spinners.set(id, spinner);
    return spinner;
  }

  updateSpinner(id: string, text: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.text = text;
    }
  }

  succeedSpinner(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.succeed(text);
      this.spinners.delete(id);
    }
  }

  failSpinner(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.fail(text);
      this.spinners.delete(id);
    }
  }

  stopSpinner(id: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.stop();
      this.spinners.delete(id);
    }
  }

  displayTrainingProgress(files: any[]): void {
    console.log(chalk.blue('\n📊 Training Progress:'));
    
    files.forEach(file => {
      const status = file.status || 'pending';
      let icon = '⏳';
      let color = chalk.yellow;
      
      switch (status) {
        case 'completed':
          icon = '✅';
          color = chalk.green;
          break;
        case 'error':
          icon = '❌';
          color = chalk.red;
          break;
        case 'processing':
          icon = '🔄';
          color = chalk.blue;
          break;
      }
      
      console.log(`${icon} ${color(file.name || file.path)} ${file.error ? chalk.red(`(${file.error})`) : ''}`);
    });
  }

}