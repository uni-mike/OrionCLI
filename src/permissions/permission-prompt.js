/**
 * Permission Prompt UI for OrionCLI
 * Interactive prompts for permission requests
 */

const readline = require('readline');
const chalk = require('chalk');

class PermissionPrompt {
  constructor() {
    this.rl = null;
  }

  /**
   * Show permission request to user
   */
  async requestPermission(toolName, args, description) {
    return new Promise((resolve) => {
      // Clear current line and show permission request
      process.stdout.write('\r\x1b[K'); // Clear line
      
      console.log('\n' + chalk.yellow('━'.repeat(80)));
      console.log(chalk.yellow('⚠️  Permission Request'));
      console.log(chalk.yellow('━'.repeat(80)));
      
      console.log(chalk.cyan(`\nOrionCLI wants to ${description}`));
      
      // Show details
      if (args.command) {
        console.log(chalk.gray(`Command: ${args.command}`));
      }
      if (args.filename || args.path) {
        console.log(chalk.gray(`File: ${args.filename || args.path}`));
      }
      if (args.content && args.content.length > 100) {
        console.log(chalk.gray(`Content: ${args.content.substring(0, 100)}...`));
      }
      
      console.log('\n' + chalk.yellow('Options:'));
      console.log('  ' + chalk.green('y') + ' - Allow this time');
      console.log('  ' + chalk.green('a') + ' - Always allow for this session');
      console.log('  ' + chalk.green('p') + ' - Always allow (save permanently)');
      console.log('  ' + chalk.red('n') + ' - Deny this time');
      console.log('  ' + chalk.red('d') + ' - Always deny for this tool');
      
      process.stdout.write('\n' + chalk.cyan('Your choice [y/a/p/n/d]: '));
      
      // Create readline interface for single input
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
      });
      
      // Set raw mode for single character input
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      
      // Listen for single keypress
      process.stdin.once('data', (key) => {
        const char = key.toString().toLowerCase();
        
        // Restore terminal
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdout.write(char + '\n');
        
        this.rl.close();
        
        // Process choice
        let decision = { allow: false, remember: false, duration: 'once' };
        
        switch (char) {
          case 'y':
            decision = { allow: true, remember: false, duration: 'once' };
            console.log(chalk.green('✅ Allowed for this time'));
            break;
            
          case 'a':
            decision = { allow: true, remember: true, duration: 'session' };
            console.log(chalk.green('✅ Allowed for this session'));
            break;
            
          case 'p':
            decision = { allow: true, remember: true, duration: 'permanent' };
            console.log(chalk.green('✅ Always allowed (saved)'));
            break;
            
          case 'n':
            decision = { allow: false, remember: false, duration: 'once' };
            console.log(chalk.red('❌ Denied'));
            break;
            
          case 'd':
            decision = { allow: false, remember: true, duration: 'permanent' };
            console.log(chalk.red('❌ Always denied (saved)'));
            break;
            
          default:
            decision = { allow: false, remember: false, duration: 'once' };
            console.log(chalk.red('❌ Invalid choice, denying'));
        }
        
        console.log(chalk.yellow('━'.repeat(80)) + '\n');
        
        resolve(decision);
      });
    });
  }

  /**
   * Show batch permission request for multiple tools
   */
  async requestBatchPermission(tools) {
    console.log('\n' + chalk.yellow('━'.repeat(80)));
    console.log(chalk.yellow('⚠️  Multiple Permissions Requested'));
    console.log(chalk.yellow('━'.repeat(80)));
    
    console.log(chalk.cyan('\nThe following actions need permission:'));
    
    tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.description}`);
    });
    
    console.log('\n' + chalk.yellow('Options:'));
    console.log('  ' + chalk.green('y') + ' - Allow all');
    console.log('  ' + chalk.green('s') + ' - Allow all for session');
    console.log('  ' + chalk.yellow('i') + ' - Review individually');
    console.log('  ' + chalk.red('n') + ' - Deny all');
    
    return new Promise((resolve) => {
      process.stdout.write('\n' + chalk.cyan('Your choice [y/s/i/n]: '));
      
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
      });
      
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      
      process.stdin.once('data', async (key) => {
        const char = key.toString().toLowerCase();
        
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdout.write(char + '\n');
        
        this.rl.close();
        
        let decisions = [];
        
        switch (char) {
          case 'y':
            decisions = tools.map(() => ({ allow: true, remember: false, duration: 'once' }));
            console.log(chalk.green('✅ All allowed'));
            break;
            
          case 's':
            decisions = tools.map(() => ({ allow: true, remember: true, duration: 'session' }));
            console.log(chalk.green('✅ All allowed for session'));
            break;
            
          case 'i':
            console.log(chalk.cyan('Reviewing individually...'));
            for (const tool of tools) {
              const decision = await this.requestPermission(tool.name, tool.args, tool.description);
              decisions.push(decision);
            }
            break;
            
          case 'n':
            decisions = tools.map(() => ({ allow: false, remember: false, duration: 'once' }));
            console.log(chalk.red('❌ All denied'));
            break;
            
          default:
            decisions = tools.map(() => ({ allow: false, remember: false, duration: 'once' }));
            console.log(chalk.red('❌ Invalid choice, denying all'));
        }
        
        console.log(chalk.yellow('━'.repeat(80)) + '\n');
        
        resolve(decisions);
      });
    });
  }

  /**
   * Show permission configuration UI
   */
  async showPermissionConfig(permissionManager) {
    const stats = permissionManager.getStats();
    
    console.log('\n' + chalk.cyan('📋 Permission Configuration'));
    console.log(chalk.cyan('━'.repeat(80)));
    
    console.log(chalk.cyan('\nCurrent Settings:'));
    console.log(`  Total Rules: ${stats.totalRules}`);
    console.log(`  ${chalk.green('Allow')}: ${stats.allowRules}`);
    console.log(`  ${chalk.yellow('Ask')}: ${stats.askRules}`);
    console.log(`  ${chalk.red('Deny')}: ${stats.denyRules}`);
    console.log(`  Session Permissions: ${stats.sessionPermissions}`);
    
    console.log('\n' + chalk.yellow('Options:'));
    console.log('  ' + chalk.cyan('v') + ' - View all rules');
    console.log('  ' + chalk.cyan('e') + ' - Edit rules');
    console.log('  ' + chalk.cyan('c') + ' - Clear session permissions');
    console.log('  ' + chalk.cyan('r') + ' - Reset to defaults');
    console.log('  ' + chalk.cyan('x') + ' - Export permissions');
    console.log('  ' + chalk.cyan('q') + ' - Quit');
    
    // Implementation for config management would go here
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.rl) {
      this.rl.close();
    }
  }
}

module.exports = PermissionPrompt;