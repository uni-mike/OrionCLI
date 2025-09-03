/**
 * Main OrionCLI class - Orchestrates all components
 */

import { TerminalRenderer } from '../terminal/renderer';
import { InputHandler } from '../input/handler';
import { AzureClient } from '../azure/client';
import { ToolRegistry } from '../tools/registry';
import { CommandProcessor } from '../commands/processor';
import { MCPManager } from '../mcp/manager';
import { HooksManager } from '../hooks/manager';
import { ConfirmationService } from '../services/confirmation';
import { SettingsManager } from '../utils/settings-manager';
import { CustomInstructionsManager } from '../utils/custom-instructions';
import { TokenCounter } from '../utils/token-counter';
import { ModelConfig } from '../utils/model-config';
import { OrionAgent } from '../agent/orion-agent';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export class OrionCLI {
  private renderer!: TerminalRenderer;
  private inputHandler!: InputHandler;
  private azureClient!: AzureClient;
  private toolRegistry!: ToolRegistry;
  private commandProcessor!: CommandProcessor;
  private mcpManager!: MCPManager;
  private hooksManager!: HooksManager;
  private confirmationService!: ConfirmationService;
  private settingsManager!: SettingsManager;
  private customInstructions!: CustomInstructionsManager;
  private tokenCounter!: TokenCounter;
  private modelConfig!: ModelConfig;
  private agent!: OrionAgent;
  
  private conversationHistory: Message[] = [];
  private sessionFlags: Map<string, boolean> = new Map();
  private isProcessing: boolean = false;
  private currentModel: string;

  constructor() {
    this.currentModel = process.env.MODEL || 'gpt-5-chat';
  }

  async initialize(): Promise<void> {
    // Initialize settings and configuration
    this.settingsManager = new SettingsManager();
    await this.settingsManager.load();
    
    this.modelConfig = new ModelConfig();
    this.tokenCounter = new TokenCounter();
    this.customInstructions = new CustomInstructionsManager();
    
    // Initialize renderer first
    this.renderer = new TerminalRenderer();
    
    // Initialize confirmation service
    this.confirmationService = new ConfirmationService(
      this.renderer,
      this.sessionFlags,
      this.settingsManager
    );
    
    // Initialize Azure client with our models
    this.azureClient = new AzureClient({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_KEY!,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT!,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
    });
    
    // Initialize tool registry
    this.toolRegistry = new ToolRegistry(
      this.renderer,
      this.confirmationService,
      this.settingsManager
    );
    await this.toolRegistry.initialize();
    
    // Initialize MCP manager
    this.mcpManager = new MCPManager(this.renderer, this.settingsManager);
    await this.mcpManager.initialize();
    
    // Register MCP tools with tool registry
    const mcpTools = await this.mcpManager.getTools();
    for (const tool of mcpTools) {
      this.toolRegistry.registerMCPTool(tool);
    }
    
    // Initialize hooks manager
    this.hooksManager = new HooksManager(this.settingsManager);
    await this.hooksManager.initialize();
    
    // Initialize command processor
    this.commandProcessor = new CommandProcessor(
      this.renderer,
      this.toolRegistry,
      this.mcpManager,
      this.settingsManager,
      this.modelConfig,
      this
    );
    
    // Initialize agent
    this.agent = new OrionAgent(
      this.azureClient,
      this.toolRegistry,
      this.renderer,
      this.tokenCounter
    );
    
    // Initialize input handler
    this.inputHandler = new InputHandler(
      this.renderer,
      this.onUserInput.bind(this),
      this.onSpecialKey.bind(this),
      this.commandProcessor
    );
    
    // Set initial model
    this.renderer.setModel(this.currentModel);
    
    // Load conversation history if exists
    await this.loadConversationHistory();
  }

  async start(): Promise<void> {
    // Clear screen
    console.clear();
    
    // Start renderer
    this.renderer.render();
    
    // Show welcome message
    const customInstructions = await this.customInstructions.getInstructions();
    if (customInstructions) {
      this.renderer.addMessage({
        type: 'system',
        content: chalk.cyan('📋 Custom instructions loaded'),
      });
    }
    
    // Show MCP status
    const mcpStatus = await this.mcpManager.getStatus();
    if (mcpStatus.connected) {
      this.renderer.setMCPStatus(`Connected (${mcpStatus.servers.length} servers)`);
    }
    
    // Show tips on first run
    const isFirstRun = await this.settingsManager.isFirstRun();
    if (isFirstRun) {
      this.showWelcomeTips();
      await this.settingsManager.setFirstRun(false);
    }
    
    // Start input handling
    this.inputHandler.start();
  }

  private showWelcomeTips(): void {
    const tips = [
      'Welcome to OrionCLI v2! 🚀',
      '',
      'Quick tips:',
      '• Type /help for available commands',
      '• Press Shift+Tab to toggle auto-edit mode',
      '• Use ↑↓ to navigate command history',
      '• Type /models to switch between AI models',
      '• Direct commands (ls, pwd, etc.) execute immediately',
      '',
      'Enjoy your enhanced CLI experience!',
    ];
    
    this.renderer.addMessage({
      type: 'system',
      content: tips.join('\n'),
    });
  }

  private async onUserInput(input: string): Promise<void> {
    if (this.isProcessing) {
      return;
    }
    
    // Add user message
    this.renderer.addMessage({
      type: 'user',
      content: input,
    });
    
    // Check for commands
    if (input.startsWith('/')) {
      await this.processCommand(input);
      return;
    }
    
    // Check for direct bash commands
    if (this.isDirectBashCommand(input)) {
      await this.executeDirectCommand(input);
      return;
    }
    
    // Run pre-submit hook
    const hookResult = await this.hooksManager.runHook('user-prompt-submit', {
      prompt: input,
      model: this.currentModel,
    });
    
    if (hookResult?.blocked) {
      this.renderer.addMessage({
        type: 'system',
        content: chalk.red(`❌ ${hookResult.message || 'Request blocked by hook'}`),
      });
      return;
    }
    
    // Process with AI
    await this.processWithAI(hookResult?.modifiedPrompt || input);
  }

  private async processCommand(command: string): Promise<void> {
    const result = await this.commandProcessor.process(command);
    
    if (result.error) {
      this.renderer.addMessage({
        type: 'system',
        content: chalk.red(result.error),
      });
      return;
    }
    
    if (result.message) {
      this.renderer.addMessage({
        type: 'system',
        content: result.message,
      });
    }
    
    // Handle special actions
    if (result.action) {
      switch (result.action) {
        case 'exit':
          await this.shutdown();
          break;
          
        case 'clear':
          this.renderer.clear();
          this.conversationHistory = [];
          break;
          
        case 'model-changed':
          this.currentModel = result.data.model;
          this.renderer.setModel(this.currentModel);
          break;
      }
    }
  }

  private isDirectBashCommand(input: string): boolean {
    const directCommands = [
      'ls', 'pwd', 'cd', 'cat', 'echo', 'mkdir', 'touch', 'rm', 'cp', 'mv',
      'grep', 'find', 'which', 'whoami', 'date', 'env', 'npm', 'yarn', 'git',
    ];
    
    const cmd = input.split(' ')[0].toLowerCase();
    return directCommands.includes(cmd);
  }

  private async executeDirectCommand(command: string): Promise<void> {
    const bashTool = this.toolRegistry.getTool('bash');
    if (!bashTool) {
      this.renderer.addMessage({
        type: 'system',
        content: chalk.red('Bash tool not available'),
      });
      return;
    }
    
    this.renderer.addMessage({
      type: 'tool',
      content: `Executing: ${command}`,
      toolName: 'bash',
    });
    
    try {
      const result = await bashTool.execute({ command });
      
      if (result.error) {
        this.renderer.addMessage({
          type: 'tool',
          content: chalk.red(result.error),
          toolName: 'bash',
        });
      } else {
        this.renderer.addMessage({
          type: 'tool',
          content: result.output || 'Command completed',
          toolName: 'bash',
        });
      }
    } catch (error: any) {
      this.renderer.addMessage({
        type: 'system',
        content: chalk.red(`Error: ${error.message}`),
      });
    }
  }

  private async processWithAI(input: string): Promise<void> {
    this.isProcessing = true;
    this.renderer.setProcessing(true);
    
    try {
      // Add custom instructions if available
      const instructions = await this.customInstructions.getInstructions();
      if (instructions && this.conversationHistory.length === 0) {
        this.conversationHistory.push({
          role: 'system',
          content: instructions,
        });
      }
      
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: input,
      });
      
      // Count tokens
      const inputTokens = this.tokenCounter.count(input);
      const historyTokens = this.tokenCounter.countMessages(this.conversationHistory);
      this.renderer.setTokenCount(historyTokens);
      
      // Get response from agent
      const response = await this.agent.process(
        this.conversationHistory,
        this.currentModel
      );
      
      // Add assistant response
      if (response.content) {
        this.renderer.addMessage({
          type: 'assistant',
          content: response.content,
        });
        
        this.conversationHistory.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls,
        });
      }
      
      // Handle tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
          await this.executeTool(toolCall);
        }
        
        // Get follow-up response after tools
        const followUp = await this.agent.process(
          this.conversationHistory,
          this.currentModel
        );
        
        if (followUp.content) {
          this.renderer.addMessage({
            type: 'assistant',
            content: followUp.content,
          });
          
          this.conversationHistory.push({
            role: 'assistant',
            content: followUp.content,
          });
        }
      }
      
      // Save conversation history
      await this.saveConversationHistory();
      
    } catch (error: any) {
      this.renderer.addMessage({
        type: 'system',
        content: chalk.red(`Error: ${error.message}`),
      });
    } finally {
      this.isProcessing = false;
      this.renderer.setProcessing(false);
    }
  }

  private async executeTool(toolCall: any): Promise<void> {
    const tool = this.toolRegistry.getTool(toolCall.function.name);
    
    if (!tool) {
      const errorMsg = `Unknown tool: ${toolCall.function.name}`;
      this.renderer.addMessage({
        type: 'system',
        content: chalk.red(errorMsg),
      });
      
      this.conversationHistory.push({
        role: 'tool',
        content: errorMsg,
        tool_call_id: toolCall.id,
      });
      return;
    }
    
    // Parse arguments
    let args = {};
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      args = toolCall.function.arguments;
    }
    
    // Show tool execution
    this.renderer.addMessage({
      type: 'tool',
      content: `Executing...`,
      toolName: toolCall.function.name,
      fileName: args.fileName || args.path,
    });
    
    try {
      // Execute tool
      const result = await tool.execute(args);
      
      // Show result based on type
      if (result.diff) {
        this.renderer.addMessage({
          type: 'tool',
          content: 'File modified',
          toolName: toolCall.function.name,
          diff: result.diff,
        });
      } else if (result.output) {
        this.renderer.addMessage({
          type: 'tool',
          content: result.output,
          toolName: toolCall.function.name,
        });
      } else if (result.error) {
        this.renderer.addMessage({
          type: 'tool',
          content: chalk.red(result.error),
          toolName: toolCall.function.name,
        });
      }
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      });
      
    } catch (error: any) {
      const errorMsg = `Tool error: ${error.message}`;
      this.renderer.addMessage({
        type: 'system',
        content: chalk.red(errorMsg),
      });
      
      this.conversationHistory.push({
        role: 'tool',
        content: errorMsg,
        tool_call_id: toolCall.id,
      });
    }
  }

  private async onSpecialKey(key: string): Promise<void> {
    switch (key) {
      case 'shift+tab':
        // Toggle auto-edit
        const autoEdit = this.settingsManager.get('autoEdit', false);
        this.settingsManager.set('autoEdit', !autoEdit);
        this.renderer.setAutoEdit(!autoEdit);
        
        this.renderer.addMessage({
          type: 'system',
          content: chalk.cyan(`Auto-edit ${!autoEdit ? 'enabled ▶' : 'disabled ⏸'}`),
        });
        break;
        
      case 'escape':
        // Cancel processing
        if (this.isProcessing) {
          this.isProcessing = false;
          this.renderer.setProcessing(false);
          this.agent.cancel();
          
          this.renderer.addMessage({
            type: 'system',
            content: chalk.yellow('Operation cancelled'),
          });
        }
        break;
        
      case 'ctrl+l':
        // Clear screen
        this.renderer.clear();
        break;
        
      case 'ctrl+c':
        // Exit if not processing
        if (!this.isProcessing) {
          await this.shutdown();
        }
        break;
    }
  }

  private async loadConversationHistory(): Promise<void> {
    try {
      const historyPath = path.join(
        process.env.HOME || process.env.USERPROFILE || '.',
        '.orion',
        'history.json'
      );
      
      const data = await fs.readFile(historyPath, 'utf-8');
      this.conversationHistory = JSON.parse(data);
    } catch {
      // No history file or error reading it
      this.conversationHistory = [];
    }
  }

  private async saveConversationHistory(): Promise<void> {
    try {
      const orionDir = path.join(
        process.env.HOME || process.env.USERPROFILE || '.',
        '.orion'
      );
      
      await fs.mkdir(orionDir, { recursive: true });
      
      const historyPath = path.join(orionDir, 'history.json');
      await fs.writeFile(
        historyPath,
        JSON.stringify(this.conversationHistory, null, 2)
      );
    } catch (error) {
      // Silently fail - history is not critical
    }
  }

  public async changeModel(model: string): Promise<void> {
    this.currentModel = model;
    this.renderer.setModel(model);
    
    // Update Azure client configuration if needed
    const modelEndpoint = this.modelConfig.getEndpoint(model);
    if (modelEndpoint) {
      this.azureClient.updateConfig({
        endpoint: modelEndpoint.endpoint,
        apiKey: modelEndpoint.apiKey,
        deployment: modelEndpoint.deployment,
      });
    }
  }

  public getConversationHistory(): Message[] {
    return this.conversationHistory;
  }

  public clearHistory(): void {
    this.conversationHistory = [];
  }

  async shutdown(): Promise<void> {
    // Save settings
    await this.settingsManager.save();
    
    // Save conversation history
    await this.saveConversationHistory();
    
    // Run shutdown hook
    await this.hooksManager.runHook('shutdown', {});
    
    // Stop MCP
    await this.mcpManager.shutdown();
    
    // Stop input handler
    this.inputHandler.stop();
    
    // Clean up renderer
    this.renderer.destroy();
    
    // Show goodbye message
    console.log(chalk.cyan('\n👋 Goodbye! Thank you for using OrionCLI.\n'));
  }
}