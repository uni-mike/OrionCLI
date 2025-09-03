/**
 * Orion Tool Registry - Modular Tool Management
 * Integrates all tool categories for OrionCLI
 */
const FileTools = require('./file-tools');
const GitTools = require('./git-tools');
const SystemTools = require('./system-tools');
const SSHTools = require('./ssh-tools');
const ConversionTools = require('./conversion-tools');
const DockerTools = require('./docker-tools');
const WebSearchTools = require('./web-search-tools');
const DatabaseTools = require('./database-tools');

class OrionToolRegistry {
  constructor() {
    this.toolCategories = {
      'file-tools': FileTools,
      'git-tools': GitTools,
      'system-tools': SystemTools,
      'ssh-tools': SSHTools,
      'conversion-tools': ConversionTools,
      'docker-tools': DockerTools,
      'web-search-tools': WebSearchTools,
      'database-tools': DatabaseTools
    };
  }

  /**
   * Get tool definitions for specified categories
   */
  getToolDefinitions(toolNames) {
    const tools = [];

    // Handle built-in tools (bash, web-search)
    if (toolNames.includes('bash')) {
      tools.push({
        type: 'function',
        function: {
          name: 'execute_bash',
          description: 'Execute bash commands and return output',
          parameters: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'The bash command to execute' }
            },
            required: ['command']
          }
        }
      });
    }

    if (toolNames.includes('web-search')) {
      tools.push({
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web for current information',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The search query' }
            },
            required: ['query']
          }
        }
      });
    }

    // Add tools from modular categories
    for (const toolCategory of toolNames) {
      if (this.toolCategories[toolCategory]) {
        const categoryDefinitions = this.toolCategories[toolCategory].getDefinitions();
        tools.push(...categoryDefinitions);
      }
    }

    return tools;
  }

  /**
   * Execute a tool by name
   */
  async executeTool(toolName, args) {
    // Check each category for the tool
    for (const [categoryName, ToolClass] of Object.entries(this.toolCategories)) {
      try {
        const result = await ToolClass.execute(toolName, args);
        return result;
      } catch (error) {
        // If error contains "Unknown", continue to next category
        if (error.message.includes('Unknown')) {
          continue;
        }
        // Otherwise, it's a real execution error
        throw error;
      }
    }
    
    // Tool not found in any category
    throw new Error(`Tool '${toolName}' not found in any category`);
  }

  /**
   * Get available tool categories
   */
  getAvailableCategories() {
    return Object.keys(this.toolCategories);
  }

  /**
   * Register a new tool category
   */
  registerCategory(name, toolClass) {
    this.toolCategories[name] = toolClass;
  }

  /**
   * Get tools summary for display
   */
  getToolsSummary() {
    const summary = [];
    
    for (const [categoryName, ToolClass] of Object.entries(this.toolCategories)) {
      const definitions = ToolClass.getDefinitions();
      summary.push({
        category: categoryName,
        count: definitions.length,
        tools: definitions.map(def => def.function.name)
      });
    }
    
    return summary;
  }

  /**
   * Search for tools by keyword
   */
  searchTools(keyword) {
    const matches = [];
    const lowerKeyword = keyword.toLowerCase();
    
    for (const [categoryName, ToolClass] of Object.entries(this.toolCategories)) {
      const definitions = ToolClass.getDefinitions();
      
      for (const definition of definitions) {
        const toolName = definition.function.name;
        const description = definition.function.description;
        
        if (toolName.toLowerCase().includes(lowerKeyword) || 
            description.toLowerCase().includes(lowerKeyword)) {
          matches.push({
            name: toolName,
            category: categoryName,
            description: description
          });
        }
      }
    }
    
    return matches;
  }
}

module.exports = OrionToolRegistry;