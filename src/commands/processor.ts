/**
 * Command Processor - Handles all slash commands
 * Processes commands like /help, /clear, /models, /commit-and-push, etc.
 */

import { TerminalRenderer } from '../terminal/renderer';
import { ToolRegistry } from '../tools/registry';
import { MCPManager } from '../mcp/manager';
import { SettingsManager } from '../utils/settings-manager';
import { ModelConfig } from '../utils/model-config';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

export interface CommandResult {
  message?: string;
  error?: string;
  action?: string;
  data?: any;
}

export class CommandProcessor {
  private renderer: TerminalRenderer;
  private toolRegistry: ToolRegistry;
  private mcpManager: MCPManager;
  private settingsManager: SettingsManager;
  private modelConfig: ModelConfig;
  private cli: any; // Reference to main CLI for model changes

  private commands: Map<string, {
    description: string;
    handler: (args: string[]) => Promise<CommandResult>;
  }> = new Map();

  constructor(
    renderer: TerminalRenderer,
    toolRegistry: ToolRegistry,
    mcpManager: MCPManager,
    settingsManager: SettingsManager,
    modelConfig: ModelConfig,
    cli: any
  ) {
    this.renderer = renderer;
    this.toolRegistry = toolRegistry;
    this.mcpManager = mcpManager;
    this.settingsManager = settingsManager;
    this.modelConfig = modelConfig;
    this.cli = cli;
    
    this.registerCommands();
  }

  private registerCommands(): void {
    // /help command
    this.commands.set('help', {
      description: 'Show available commands',
      handler: async () => this.handleHelp(),
    });

    // /clear command
    this.commands.set('clear', {
      description: 'Clear chat history',
      handler: async () => ({
        action: 'clear',
        message: 'Chat history cleared',
      }),
    });

    // /models command
    this.commands.set('models', {
      description: 'List and switch between AI models',
      handler: async (args) => this.handleModels(args),
    });

    // /model command (alias)
    this.commands.set('model', {
      description: 'Switch to a specific model',
      handler: async (args) => this.handleModels(args),
    });

    // /commit-and-push command
    this.commands.set('commit-and-push', {
      description: 'Commit and push changes to git',
      handler: async (args) => this.handleCommitAndPush(args),
    });

    // /commit command
    this.commands.set('commit', {
      description: 'Commit changes to git',
      handler: async (args) => this.handleCommit(args),
    });

    // /settings command
    this.commands.set('settings', {
      description: 'View or modify settings',
      handler: async (args) => this.handleSettings(args),
    });

    // /tools command
    this.commands.set('tools', {
      description: 'List available tools',
      handler: async () => this.handleTools(),
    });

    // /mcp command
    this.commands.set('mcp', {
      description: 'MCP server management',
      handler: async (args) => this.handleMCP(args),
    });

    // /history command
    this.commands.set('history', {
      description: 'View conversation history',
      handler: async (args) => this.handleHistory(args),
    });

    // /save command
    this.commands.set('save', {
      description: 'Save conversation to file',
      handler: async (args) => this.handleSave(args),
    });

    // /load command
    this.commands.set('load', {
      description: 'Load conversation from file',
      handler: async (args) => this.handleLoad(args),
    });

    // /exit command
    this.commands.set('exit', {
      description: 'Exit OrionCLI',
      handler: async () => ({
        action: 'exit',
        message: 'Goodbye!',
      }),
    });

    // /quit command (alias)
    this.commands.set('quit', {
      description: 'Exit OrionCLI',
      handler: async () => ({
        action: 'exit',
        message: 'Goodbye!',
      }),
    });

    // /version command
    this.commands.set('version', {
      description: 'Show OrionCLI version',
      handler: async () => this.handleVersion(),
    });
  }

  async process(command: string): Promise<CommandResult> {
    const parts = command.slice(1).split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const commandDef = this.commands.get(cmd);
    if (!commandDef) {
      return {
        error: `Unknown command: /${cmd}. Type /help for available commands.`,
      };
    }

    try {
      return await commandDef.handler(args);
    } catch (error: any) {
      return {
        error: `Command failed: ${error.message}`,
      };
    }
  }

  private async handleHelp(): Promise<CommandResult> {
    const lines = [
      chalk.cyan.bold('📚 OrionCLI Commands'),
      '',
      chalk.yellow('Chat Commands:'),
      '  /help              - Show this help message',
      '  /clear             - Clear chat history',
      '  /exit, /quit       - Exit OrionCLI',
      '',
      chalk.yellow('Model Commands:'),
      '  /models            - List available models',
      '  /model <name>      - Switch to a specific model',
      '',
      chalk.yellow('Git Commands:'),
      '  /commit <message>  - Commit changes to git',
      '  /commit-and-push   - Commit and push to remote',
      '',
      chalk.yellow('Session Commands:'),
      '  /save <file>       - Save conversation to file',
      '  /load <file>       - Load conversation from file',
      '  /history           - View conversation history',
      '',
      chalk.yellow('System Commands:'),
      '  /settings          - View or modify settings',
      '  /tools             - List available tools',
      '  /mcp               - MCP server management',
      '  /version           - Show version info',
      '',
      chalk.cyan('Keyboard Shortcuts:'),
      '  Shift+Tab          - Toggle auto-edit mode',
      '  ↑/↓                - Navigate command history',
      '  Ctrl+A/E           - Jump to start/end of line',
      '  Ctrl+W             - Delete word before cursor',
      '  Ctrl+L             - Clear screen',
      '  Esc                - Cancel current operation',
      '',
      chalk.gray('Direct bash commands (ls, pwd, cd, etc.) execute immediately'),
    ];

    return {
      message: lines.join('\n'),
    };
  }

  private async handleModels(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      // List available models
      const models = this.modelConfig.getAvailableModels();
      const currentModel = this.settingsManager.get('model', 'gpt-5-chat');
      
      const lines = [
        chalk.cyan.bold('🤖 Available Models:'),
        '',
      ];
      
      for (const model of models) {
        const isCurrent = model.name === currentModel;
        const marker = isCurrent ? chalk.green('▶') : ' ';
        lines.push(`${marker} ${chalk.bold(model.name)} - ${model.description}`);
      }
      
      lines.push('');
      lines.push(chalk.gray('Use /model <name> to switch models'));
      
      return {
        message: lines.join('\n'),
      };
    } else {
      // Switch to specified model
      const modelName = args[0];
      const models = this.modelConfig.getAvailableModels();
      const model = models.find(m => m.name === modelName);
      
      if (!model) {
        return {
          error: `Model "${modelName}" not found. Use /models to see available models.`,
        };
      }
      
      await this.cli.changeModel(modelName);
      this.settingsManager.set('model', modelName);
      
      return {
        message: chalk.green(`✅ Switched to model: ${modelName}`),
        action: 'model-changed',
        data: { model: modelName },
      };
    }
  }

  private async handleCommit(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return {
        error: 'Please provide a commit message: /commit <message>',
      };
    }
    
    try {
      const message = args.join(' ');
      execSync('git add -A', { encoding: 'utf-8' });
      execSync(`git commit -m "${message}"`, { encoding: 'utf-8' });
      
      return {
        message: chalk.green('✅ Changes committed successfully'),
      };
    } catch (error: any) {
      return {
        error: `Git commit failed: ${error.message}`,
      };
    }
  }

  private async handleCommitAndPush(args: string[]): Promise<CommandResult> {
    try {
      // First commit
      if (args.length > 0) {
        const commitResult = await this.handleCommit(args);
        if (commitResult.error) {
          return commitResult;
        }
      }
      
      // Then push
      const output = execSync('git push', { encoding: 'utf-8' });
      
      return {
        message: chalk.green('✅ Changes committed and pushed successfully'),
      };
    } catch (error: any) {
      return {
        error: `Git push failed: ${error.message}`,
      };
    }
  }

  private async handleSettings(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      // Show current settings
      const settings = this.settingsManager.getAll();
      const lines = [
        chalk.cyan.bold('⚙️  Current Settings:'),
        '',
      ];
      
      for (const [key, value] of Object.entries(settings)) {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
      
      return {
        message: lines.join('\n'),
      };
    }
    
    if (args[0] === 'set' && args.length >= 3) {
      const key = args[1];
      const value = args.slice(2).join(' ');
      
      try {
        const parsedValue = JSON.parse(value);
        this.settingsManager.set(key, parsedValue);
        await this.settingsManager.save();
        
        return {
          message: chalk.green(`✅ Setting "${key}" updated`),
        };
      } catch {
        this.settingsManager.set(key, value);
        await this.settingsManager.save();
        
        return {
          message: chalk.green(`✅ Setting "${key}" updated`),
        };
      }
    }
    
    return {
      error: 'Usage: /settings or /settings set <key> <value>',
    };
  }

  private async handleTools(): Promise<CommandResult> {
    const tools = this.toolRegistry.getToolNames();
    const lines = [
      chalk.cyan.bold('🔧 Available Tools:'),
      '',
    ];
    
    for (const tool of tools) {
      const toolObj = this.toolRegistry.getTool(tool);
      if (toolObj) {
        lines.push(`  ${chalk.bold(tool)} - ${toolObj.description}`);
      }
    }
    
    return {
      message: lines.join('\n'),
    };
  }

  private async handleMCP(args: string[]): Promise<CommandResult> {
    if (args.length === 0 || args[0] === 'status') {
      const status = await this.mcpManager.getStatus();
      const lines = [
        chalk.cyan.bold('🔌 MCP Status:'),
        '',
        `  Connected: ${status.connected ? chalk.green('Yes') : chalk.red('No')}`,
        `  Servers: ${status.servers.length}`,
      ];
      
      if (status.servers.length > 0) {
        lines.push('');
        lines.push('  Active Servers:');
        for (const server of status.servers) {
          lines.push(`    - ${server}`);
        }
      }
      
      return {
        message: lines.join('\n'),
      };
    }
    
    if (args[0] === 'restart') {
      await this.mcpManager.restart();
      return {
        message: chalk.green('✅ MCP servers restarted'),
      };
    }
    
    return {
      error: 'Usage: /mcp [status|restart]',
    };
  }

  private async handleHistory(args: string[]): Promise<CommandResult> {
    const history = this.cli.getConversationHistory();
    
    if (history.length === 0) {
      return {
        message: chalk.gray('No conversation history'),
      };
    }
    
    const limit = args[0] ? parseInt(args[0]) : 10;
    const recent = history.slice(-limit);
    
    const lines = [
      chalk.cyan.bold(`📜 Recent History (last ${recent.length} messages):`),
      '',
    ];
    
    for (const msg of recent) {
      const role = msg.role === 'user' ? chalk.green('You') : 
                   msg.role === 'assistant' ? chalk.blue('Assistant') :
                   msg.role === 'tool' ? chalk.yellow('Tool') :
                   chalk.gray('System');
      
      const content = msg.content.substring(0, 100);
      const truncated = msg.content.length > 100 ? '...' : '';
      lines.push(`${role}: ${content}${truncated}`);
    }
    
    return {
      message: lines.join('\n'),
    };
  }

  private async handleSave(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return {
        error: 'Please provide a filename: /save <filename>',
      };
    }
    
    try {
      const filename = args[0];
      const history = this.cli.getConversationHistory();
      const data = JSON.stringify(history, null, 2);
      
      await fs.writeFile(filename, data, 'utf-8');
      
      return {
        message: chalk.green(`✅ Conversation saved to ${filename}`),
      };
    } catch (error: any) {
      return {
        error: `Failed to save: ${error.message}`,
      };
    }
  }

  private async handleLoad(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return {
        error: 'Please provide a filename: /load <filename>',
      };
    }
    
    try {
      const filename = args[0];
      const data = await fs.readFile(filename, 'utf-8');
      const history = JSON.parse(data);
      
      // Validate the loaded data
      if (!Array.isArray(history)) {
        throw new Error('Invalid conversation file format');
      }
      
      // Load into CLI
      this.cli.clearHistory();
      for (const msg of history) {
        this.cli.getConversationHistory().push(msg);
      }
      
      return {
        message: chalk.green(`✅ Conversation loaded from ${filename}`),
      };
    } catch (error: any) {
      return {
        error: `Failed to load: ${error.message}`,
      };
    }
  }

  private async handleVersion(): Promise<CommandResult> {
    try {
      const packageJson = await fs.readFile(
        path.join(process.cwd(), 'package.json'),
        'utf-8'
      );
      const pkg = JSON.parse(packageJson);
      
      const lines = [
        chalk.cyan.bold('OrionCLI'),
        `Version: ${pkg.version}`,
        `Description: ${pkg.description}`,
        '',
        chalk.gray('Enhanced Azure OpenAI CLI'),
        chalk.gray('A better fork of grok-cli'),
      ];
      
      return {
        message: lines.join('\n'),
      };
    } catch {
      return {
        message: 'OrionCLI v2.0.0 - Enhanced Azure OpenAI CLI',
      };
    }
  }

  getSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    
    for (const [cmd, def] of this.commands.entries()) {
      if (cmd.startsWith(input.toLowerCase())) {
        suggestions.push(cmd);
      }
    }
    
    return suggestions.sort();
  }

  getCommands(): string[] {
    return Array.from(this.commands.keys()).sort();
  }
}