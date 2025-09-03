/**
 * MCP Manager - Manages Model Context Protocol servers
 * Handles MCP server connections and tool registration
 */

import { TerminalRenderer } from '../terminal/renderer';
import { SettingsManager } from '../utils/settings-manager';
import { MCPClient } from './client';
import { MCPConfig, loadMCPConfig } from './config';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';

export interface MCPStatus {
  connected: boolean;
  servers: string[];
  error?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  execute: (args: any) => Promise<any>;
  server: string;
}

export class MCPManager {
  private renderer: TerminalRenderer;
  private settingsManager: SettingsManager;
  private clients: Map<string, MCPClient> = new Map();
  private tools: Map<string, MCPTool> = new Map();
  private config?: MCPConfig;
  private isInitialized: boolean = false;

  constructor(renderer: TerminalRenderer, settingsManager: SettingsManager) {
    this.renderer = renderer;
    this.settingsManager = settingsManager;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Load MCP configuration
      const configPath = this.getConfigPath();
      this.config = await loadMCPConfig(configPath);
      
      if (!this.config || !this.config.servers || Object.keys(this.config.servers).length === 0) {
        // No MCP servers configured
        this.isInitialized = true;
        return;
      }
      
      // Connect to each configured server
      for (const [name, serverConfig] of Object.entries(this.config.servers)) {
        try {
          await this.connectServer(name, serverConfig);
        } catch (error: any) {
          console.error(chalk.yellow(`⚠️  Failed to connect to MCP server "${name}": ${error.message}`));
        }
      }
      
      this.isInitialized = true;
    } catch (error: any) {
      console.error(chalk.yellow(`⚠️  Failed to initialize MCP: ${error.message}`));
      this.isInitialized = true;
    }
  }

  private async connectServer(name: string, config: any): Promise<void> {
    const client = new MCPClient(name, config);
    
    try {
      await client.connect();
      this.clients.set(name, client);
      
      // Register tools from this server
      const tools = await client.getTools();
      for (const tool of tools) {
        const mcpTool: MCPTool = {
          name: `${name}_${tool.name}`,
          description: tool.description,
          inputSchema: tool.inputSchema,
          execute: async (args: any) => {
            return await client.executeTool(tool.name, args);
          },
          server: name,
        };
        
        this.tools.set(mcpTool.name, mcpTool);
      }
      
      console.log(chalk.green(`✓ Connected to MCP server: ${name}`));
    } catch (error: any) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  private getConfigPath(): string {
    // Check for config in multiple locations
    const locations = [
      path.join(process.cwd(), '.mcp', 'config.json'),
      path.join(process.cwd(), 'mcp.config.json'),
      path.join(os.homedir(), '.orion', 'mcp.config.json'),
      path.join(os.homedir(), '.config', 'orion', 'mcp.json'),
    ];
    
    // For now, use the first location
    // In production, would check each location
    return locations[0];
  }

  async getStatus(): Promise<MCPStatus> {
    const connectedServers: string[] = [];
    
    for (const [name, client] of this.clients.entries()) {
      if (client.isConnected()) {
        connectedServers.push(name);
      }
    }
    
    return {
      connected: connectedServers.length > 0,
      servers: connectedServers,
    };
  }

  async getTools(): Promise<MCPTool[]> {
    return Array.from(this.tools.values());
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`MCP tool "${name}" not found`);
    }
    
    return await tool.execute(args);
  }

  async restart(): Promise<void> {
    await this.shutdown();
    this.clients.clear();
    this.tools.clear();
    this.isInitialized = false;
    await this.initialize();
  }

  async shutdown(): Promise<void> {
    for (const [name, client] of this.clients.entries()) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error(chalk.yellow(`Warning: Error disconnecting from ${name}`));
      }
    }
    
    this.clients.clear();
    this.tools.clear();
  }

  getServerList(): string[] {
    return Array.from(this.clients.keys());
  }

  isConnected(): boolean {
    for (const client of this.clients.values()) {
      if (client.isConnected()) {
        return true;
      }
    }
    return false;
  }
}