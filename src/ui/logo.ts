/**
 * Logo Display - Shows OrionCLI ASCII art logo
 */

import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';

export function displayLogo(): void {
  const logo = figlet.textSync('ORION CLI', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });
  
  // Create gradient effect
  const gradientLogo = gradient.pastel.multiline(logo);
  
  console.log(gradientLogo);
  console.log(chalk.cyan('  Enhanced Azure OpenAI CLI - v2.0.0'));
  console.log(chalk.gray('  A better fork of grok-cli with all features preserved\n'));
}