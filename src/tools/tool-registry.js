/**
 * Tool Registry - Central management of all tools
 */
const FileTools = require('./file-tools');
const GitTools = require('./git-tools');
const SystemTools = require('./system-tools');

class ToolRegistry {
  constructor() {
    this.toolCategories = {
      'file-tools': FileTools,
      'git-tools': GitTools,
      'system-tools': SystemTools,
      // More will be added here
    };
  }

  /**
   * Get tool definitions for specified categories
   */
  getToolDefinitions(toolNames) {
    const tools = [];
    
    // Handle bash tools separately (built into main CLI)
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

    // Handle web-search separately (built into main CLI) 
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

    // Add tools from registered categories
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
        // If error is "Unknown tool", continue to next category
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
}

module.exports = ToolRegistry;