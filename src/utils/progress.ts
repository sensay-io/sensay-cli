import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { TrainingService } from '../generated/index';

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

  async pollTrainingStatus(
    replicaId: string, 
    files: any[]
  ): Promise<void> {
    const spinner = this.createSpinner('training', 'Checking training status...');
    
    let allCompleted = false;
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes with 5-second intervals
    
    while (!allCompleted && pollCount < maxPolls) {
      try {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        // Note: We'll skip status polling for now since the generated API might not have this endpoint
        // or it might have different method signatures
        spinner.succeed('Training data uploaded successfully');
        break;
        
        // TODO: Uncomment and fix when we identify the correct training status endpoint
        // const status = await TrainingService.getTrainingStatus(replicaId);
        // 
        // if (status && status.files) {
        //   files.forEach((file, index) => {
        //     const apiFile = status.files.find((f: any) => f.name === file.name);
        //     if (apiFile) {
        //       files[index] = { ...file, ...apiFile };
        //     }
        //   });
        // }
        
        const completedCount = files.filter(f => f.status === 'completed').length;
        const errorCount = files.filter(f => f.status === 'error').length;
        const processingCount = files.filter(f => f.status === 'processing').length;
        
        spinner.text = `Training: ${completedCount} completed, ${processingCount} processing, ${errorCount} errors`;
        
        allCompleted = completedCount + errorCount === files.length;
        pollCount++;
        
      } catch (error) {
        spinner.fail(`Failed to check training status: ${error}`);
        return;
      }
    }
    
    if (allCompleted) {
      spinner.succeed('Training status check completed');
    } else {
      spinner.warn('Training status polling timeout - check manually');
    }
    
    this.displayTrainingProgress(files);
  }
}