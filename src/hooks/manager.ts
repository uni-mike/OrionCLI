/**
 * Hooks Manager - Manages extensibility hooks
 * Allows users to hook into various events like user-prompt-submit
 */

import { SettingsManager } from '../utils/settings-manager';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';

export interface HookResult {
  blocked?: boolean;
  message?: string;
  modifiedPrompt?: string;
  data?: any;
}

export interface Hook {
  name: string;
  command: string;
  async?: boolean;
  timeout?: number;
}

export class HooksManager {
  private settingsManager: SettingsManager;
  private hooks: Map<string, Hook[]> = new Map();
  private hooksPath: string;

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
    this.hooksPath = path.join(process.cwd(), '.orion', 'hooks');
  }

  async initialize(): Promise<void> {
    await this.loadHooks();
  }

  async loadHooks(): Promise<void> {
    try {
      // Load hooks from settings
      const configuredHooks = this.settingsManager.get('hooks', {}) as Record<string, Hook[]>;
      
      for (const [eventName, eventHooks] of Object.entries(configuredHooks)) {
        this.hooks.set(eventName, eventHooks);
      }
      
      // Also check for hooks in .orion/hooks directory
      await this.loadHooksFromDirectory();
      
    } catch (error: any) {
      console.error(chalk.yellow(`⚠️  Failed to load hooks: ${error.message}`));
    }
  }

  private async loadHooksFromDirectory(): Promise<void> {
    try {
      await fs.access(this.hooksPath);
      const files = await fs.readdir(this.hooksPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const hookPath = path.join(this.hooksPath, file);
          const content = await fs.readFile(hookPath, 'utf-8');
          const hook = JSON.parse(content) as Hook;
          
          const eventName = file.replace('.json', '');
          const existing = this.hooks.get(eventName) || [];
          existing.push(hook);
          this.hooks.set(eventName, existing);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read - that's ok
    }
  }

  async runHook(eventName: string, data: any): Promise<HookResult | null> {
    const eventHooks = this.hooks.get(eventName);
    if (!eventHooks || eventHooks.length === 0) {
      return null;
    }
    
    let result: HookResult = {};
    
    for (const hook of eventHooks) {
      try {
        const hookResult = await this.executeHook(hook, data);
        
        // Merge results
        if (hookResult.blocked) {
          result.blocked = true;
          result.message = hookResult.message || result.message;
          break; // Stop processing if blocked
        }
        
        if (hookResult.modifiedPrompt) {
          data.prompt = hookResult.modifiedPrompt;
          result.modifiedPrompt = hookResult.modifiedPrompt;
        }
        
        if (hookResult.data) {
          result.data = { ...result.data, ...hookResult.data };
        }
        
      } catch (error: any) {
        console.error(chalk.yellow(`⚠️  Hook "${hook.name}" failed: ${error.message}`));
      }
    }
    
    return result;
  }

  private async executeHook(hook: Hook, data: any): Promise<HookResult> {
    return new Promise((resolve, reject) => {
      const timeout = hook.timeout || 5000;
      const env = {
        ...process.env,
        ORION_HOOK_DATA: JSON.stringify(data),
        ORION_HOOK_NAME: hook.name,
      };
      
      const child = spawn(hook.command, [], {
        shell: true,
        env,
        timeout,
      });
      
      let output = '';
      let error = '';
      
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });
      
      child.stderr.on('data', (chunk) => {
        error += chunk.toString();
      });
      
      child.on('close', (code) => {
        if (code !== 0) {
          // Non-zero exit code means block
          resolve({
            blocked: true,
            message: error || output || `Hook blocked with code ${code}`,
          });
        } else {
          // Try to parse output as JSON
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch {
            // If not JSON, treat as plain text
            if (output.trim()) {
              resolve({
                modifiedPrompt: output.trim(),
              });
            } else {
              resolve({});
            }
          }
        }
      });
      
      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  registerHook(eventName: string, hook: Hook): void {
    const existing = this.hooks.get(eventName) || [];
    existing.push(hook);
    this.hooks.set(eventName, existing);
    
    // Save to settings
    const allHooks: Record<string, Hook[]> = {};
    for (const [name, hooks] of this.hooks.entries()) {
      allHooks[name] = hooks;
    }
    this.settingsManager.set('hooks', allHooks);
  }

  unregisterHook(eventName: string, hookName: string): void {
    const existing = this.hooks.get(eventName);
    if (!existing) return;
    
    const filtered = existing.filter(h => h.name !== hookName);
    if (filtered.length > 0) {
      this.hooks.set(eventName, filtered);
    } else {
      this.hooks.delete(eventName);
    }
    
    // Update settings
    const allHooks: Record<string, Hook[]> = {};
    for (const [name, hooks] of this.hooks.entries()) {
      allHooks[name] = hooks;
    }
    this.settingsManager.set('hooks', allHooks);
  }

  getHooks(eventName?: string): Hook[] {
    if (eventName) {
      return this.hooks.get(eventName) || [];
    }
    
    // Return all hooks
    const allHooks: Hook[] = [];
    for (const hooks of this.hooks.values()) {
      allHooks.push(...hooks);
    }
    return allHooks;
  }

  getEventNames(): string[] {
    return Array.from(this.hooks.keys());
  }
}