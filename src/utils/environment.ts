/**
 * Environment Checker - Validates environment setup
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';

export interface EnvironmentCheck {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function checkEnvironment(): Promise<EnvironmentCheck> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for API keys
  if (!process.env.AZURE_OPENAI_ENDPOINT && !process.env.ORION_DEFAULT_KEY) {
    errors.push('No Azure OpenAI credentials found. Please set up your .env file.');
  }
  
  // Check for required environment variables
  const requiredVars = [
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_KEY',
    'AZURE_OPENAI_DEPLOYMENT',
  ];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      // Check if using ORION_ prefix instead
      const orionVar = varName.replace('AZURE_OPENAI_', 'ORION_');
      if (!process.env[orionVar]) {
        warnings.push(`${varName} is not set. Some features may not work.`);
      }
    }
  }
  
  // Check for Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion < 16) {
    errors.push(`Node.js version ${nodeVersion} is too old. Please upgrade to v16 or later.`);
  }
  
  // Check for .env file
  try {
    const envPath = path.join(process.cwd(), '.env');
    await fs.access(envPath);
  } catch {
    warnings.push('No .env file found in current directory. Using system environment variables.');
  }
  
  // Check terminal capabilities
  if (!process.stdout.isTTY) {
    warnings.push('Not running in a TTY. Some features may not work correctly.');
  }
  
  // Check for write permissions in home directory for settings
  try {
    const orionDir = path.join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.orion'
    );
    await fs.mkdir(orionDir, { recursive: true });
    await fs.access(orionDir, fs.constants.W_OK);
  } catch {
    warnings.push('Cannot write to ~/.orion directory. Settings may not persist.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}