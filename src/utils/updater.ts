/**
 * Update Notifier - Checks for OrionCLI updates
 */

import updateNotifier from 'update-notifier';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';

export function checkForUpdates(): void {
  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    const notifier = updateNotifier({
      pkg,
      updateCheckInterval: 1000 * 60 * 60 * 24, // 1 day
    });
    
    if (notifier.update) {
      const message = [
        '',
        chalk.yellow('╭─────────────────────────────────────────╮'),
        chalk.yellow('│') + '                                         ' + chalk.yellow('│'),
        chalk.yellow('│') + chalk.cyan('    Update available: ') + chalk.gray(notifier.update.current) + ' → ' + chalk.green(notifier.update.latest) + '    ' + chalk.yellow('│'),
        chalk.yellow('│') + chalk.gray('    Run ') + chalk.cyan('npm update -g orion-cli') + chalk.gray(' to update') + '  ' + chalk.yellow('│'),
        chalk.yellow('│') + '                                         ' + chalk.yellow('│'),
        chalk.yellow('╰─────────────────────────────────────────╯'),
        '',
      ].join('\n');
      
      console.log(message);
    }
  } catch (error) {
    // Silently fail - updates are not critical
  }
}

export { checkForUpdates as updateNotifier };