/**
 * Tool Registry - Manages all available tools (built-in and MCP)
 * Centralizes tool registration and execution
 */

import { TerminalRenderer } from '../terminal/renderer';
import { ConfirmationService } from '../services/confirmation';
import { SettingsManager } from '../utils/settings-manager';
import { BashTool } from './bash';
import { TextEditorTool } from './text-editor';
import { MorphEditorTool } from './morph-editor';
import { SearchTool } from './search';
import { TodoTool } from './todo-tool';
import { ConfirmationTool } from './confirmation-tool';
import type { AzureTool } from '../azure/client';

export interface Tool {
  name: string;
  description: string;
  execute: (args: any) => Promise<ToolResult>;
  getDefinition: () => AzureTool;
}

export interface ToolResult {
  output?: string;
  error?: string;
  diff?: {
    oldContent: string;
    newContent: string;
    fileName: string;
  };
  data?: any;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  execute: (args: any) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private renderer: TerminalRenderer;
  private confirmationService: ConfirmationService;
  private settingsManager: SettingsManager;

  constructor(
    renderer: TerminalRenderer,
    confirmationService: ConfirmationService,
    settingsManager: SettingsManager
  ) {
    this.renderer = renderer;
    this.confirmationService = confirmationService;
    this.settingsManager = settingsManager;
  }

  async initialize(): Promise<void> {
    await this.registerBuiltinTools();
  }

  async registerBuiltinTools(): Promise<void> {
    // Register Bash tool
    const bashTool = new BashTool(this.confirmationService);
    this.registerTool('bash', {
      name: 'bash',
      description: 'Execute bash commands',
      execute: bashTool.execute.bind(bashTool),
      getDefinition: () => ({
        type: 'function',
        function: {
          name: 'bash',
          description: 'Execute a bash command and return the output',
          parameters: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The bash command to execute',
              },
              workingDirectory: {
                type: 'string',
                description: 'The working directory for the command (optional)',
              },
            },
            required: ['command'],
          },
        },
      }),
    });

    // Register TextEditor tool
    const textEditorTool = new TextEditorTool(this.confirmationService);
    this.registerTool('text_editor', {
      name: 'text_editor',
      description: 'View, create, and edit text files',
      execute: textEditorTool.execute.bind(textEditorTool),
      getDefinition: () => ({
        type: 'function',
        function: {
          name: 'text_editor',
          description: 'View, create, or edit text files',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['view', 'create', 'edit'],
                description: 'The action to perform',
              },
              fileName: {
                type: 'string',
                description: 'The file path',
              },
              content: {
                type: 'string',
                description: 'Content for create/edit actions',
              },
              startLine: {
                type: 'number',
                description: 'Starting line for view action',
              },
              endLine: {
                type: 'number',
                description: 'Ending line for view action',
              },
            },
            required: ['action', 'fileName'],
          },
        },
      }),
    });

    // Register MorphEditor tool
    const morphEditorTool = new MorphEditorTool(this.confirmationService);
    this.registerTool('morph_editor', {
      name: 'morph_editor',
      description: 'Advanced text transformation and editing',
      execute: morphEditorTool.execute.bind(morphEditorTool),
      getDefinition: () => ({
        type: 'function',
        function: {
          name: 'morph_editor',
          description: 'Perform advanced text transformations',
          parameters: {
            type: 'object',
            properties: {
              fileName: {
                type: 'string',
                description: 'The file to edit',
              },
              operation: {
                type: 'string',
                enum: ['replace', 'insert', 'delete', 'transform'],
                description: 'The operation to perform',
              },
              pattern: {
                type: 'string',
                description: 'Pattern to match (regex supported)',
              },
              replacement: {
                type: 'string',
                description: 'Replacement text',
              },
              line: {
                type: 'number',
                description: 'Line number for insert/delete',
              },
              transformation: {
                type: 'string',
                description: 'Transformation to apply',
              },
            },
            required: ['fileName', 'operation'],
          },
        },
      }),
    });

    // Register Search tool
    const searchTool = new SearchTool();
    this.registerTool('search', {
      name: 'search',
      description: 'Search for files and content',
      execute: searchTool.execute.bind(searchTool),
      getDefinition: () => ({
        type: 'function',
        function: {
          name: 'search',
          description: 'Search for files or content in files',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query or pattern',
              },
              path: {
                type: 'string',
                description: 'Path to search in',
              },
              type: {
                type: 'string',
                enum: ['file', 'content', 'regex'],
                description: 'Type of search',
              },
              filePattern: {
                type: 'string',
                description: 'File name pattern to filter',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results',
              },
            },
            required: ['query'],
          },
        },
      }),
    });

    // Register Todo tool
    const todoTool = new TodoTool(this.renderer);
    this.registerTool('todo', {
      name: 'todo',
      description: 'Manage a todo list',
      execute: todoTool.execute.bind(todoTool),
      getDefinition: () => ({
        type: 'function',
        function: {
          name: 'todo',
          description: 'Manage a todo list',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['add', 'remove', 'list', 'complete', 'clear'],
                description: 'Action to perform',
              },
              item: {
                type: 'string',
                description: 'Todo item text',
              },
              index: {
                type: 'number',
                description: 'Item index for remove/complete',
              },
            },
            required: ['action'],
          },
        },
      }),
    });

    // Register Confirmation tool
    const confirmationTool = new ConfirmationTool(this.confirmationService);
    this.registerTool('confirmation', {
      name: 'confirmation',
      description: 'Request user confirmation',
      execute: confirmationTool.execute.bind(confirmationTool),
      getDefinition: () => ({
        type: 'function',
        function: {
          name: 'confirmation',
          description: 'Request user confirmation for an action',
          parameters: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Confirmation message to show',
              },
              type: {
                type: 'string',
                enum: ['yesno', 'confirm', 'proceed'],
                description: 'Type of confirmation',
              },
            },
            required: ['message'],
          },
        },
      }),
    });
  }

  registerTool(name: string, tool: Tool): void {
    this.tools.set(name, tool);
  }

  registerMCPTool(mcpTool: MCPTool): void {
    const tool: Tool = {
      name: mcpTool.name,
      description: mcpTool.description,
      execute: async (args: any) => {
        try {
          const result = await mcpTool.execute(args);
          return {
            output: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          };
        } catch (error: any) {
          return {
            error: error.message,
          };
        }
      },
      getDefinition: () => ({
        type: 'function',
        function: {
          name: mcpTool.name,
          description: mcpTool.description,
          parameters: mcpTool.inputSchema || {
            type: 'object',
            properties: {},
          },
        },
      }),
    };
    
    this.registerTool(mcpTool.name, tool);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolDefinitions(): AzureTool[] {
    return this.getAllTools().map(tool => tool.getDefinition());
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  async executeTool(name: string, args: any): Promise<ToolResult> {
    const tool = this.getTool(name);
    if (!tool) {
      return {
        error: `Tool "${name}" not found`,
      };
    }
    
    try {
      return await tool.execute(args);
    } catch (error: any) {
      return {
        error: `Tool execution failed: ${error.message}`,
      };
    }
  }
}