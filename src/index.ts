#!/usr/bin/env node

/**
 * OrionCLI v2 - Enhanced Azure OpenAI CLI
 * A better fork of grok-cli with all features preserved and improved
 * 
 * Features:
 * - All original grok-cli tools and commands
 * - MCP (Model Context Protocol) support
 * - Hooks system for extensibility
 * - Rich terminal UI without flickering
 * - Multi-model Azure OpenAI support
 * - Session-based confirmation memory
 * - Advanced input handling with history
 * - Markdown rendering and syntax highlighting
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { OrionCLI } from './cli/main';
import { checkEnvironment } from './utils/environment';
import { displayLogo } from './ui/logo';
import { updateNotifier } from './utils/updater';
import chalk from 'chalk';

// Load environment variables
dotenv.config();
const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Check for updates
updateNotifier();

async function main() {
  try {
    // Display logo
    displayLogo();
    
    // Check environment
    const envCheck = await checkEnvironment();
    if (!envCheck.valid) {
      console.error(chalk.red('\n❌ Environment check failed:'));
      envCheck.errors.forEach(error => {
        console.error(chalk.red(`   - ${error}`));
      });
      console.error(chalk.yellow('\n💡 Please check your .env file and ensure all required API keys are set.'));
      process.exit(1);
    }
    
    // Initialize and start CLI
    const cli = new OrionCLI();
    await cli.initialize();
    await cli.start();
    
    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(chalk.yellow(`\n\nReceived ${signal}, shutting down gracefully...`));
      await cli.shutdown();
      process.exit(0);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error(chalk.red('\n❌ Uncaught exception:'), error);
      cli.shutdown().then(() => process.exit(1));
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error(chalk.red('\n❌ Unhandled rejection at:'), promise, chalk.red('reason:'), reason);
      cli.shutdown().then(() => process.exit(1));
    });
    
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to start OrionCLI:'), error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { OrionCLI };