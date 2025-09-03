/**
 * File Operations Tools
 */
const fs = require('fs').promises;
const path = require('path');

class FileTools {
  static getDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'write_file',
          description: 'Create or write content to a file',
          parameters: {
            type: 'object',
            properties: {
              filename: { type: 'string', description: 'The name of the file to write' },
              content: { type: 'string', description: 'The content to write to the file' }
            },
            required: ['filename', 'content']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'read_file',
          description: 'Read the contents of a file',
          parameters: {
            type: 'object',
            properties: {
              filename: { type: 'string', description: 'The name of the file to read' }
            },
            required: ['filename']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'edit_file',
          description: 'Edit a file by replacing specific text',
          parameters: {
            type: 'object',
            properties: {
              filename: { type: 'string', description: 'The name of the file to edit' },
              old_text: { type: 'string', description: 'The text to replace' },
              new_text: { type: 'string', description: 'The replacement text' }
            },
            required: ['filename', 'old_text', 'new_text']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_files',
          description: 'List files in a directory',
          parameters: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Directory path (default: current)' }
            },
            required: []
          }
        }
      }
    ];
  }

  static async writeFile(filename, content) {
    try {
      await fs.writeFile(filename, content, 'utf8');
      return `✅ File '${filename}' created successfully (${content.length} characters)`;
    } catch (error) {
      throw new Error(`Failed to write file '${filename}': ${error.message}`);
    }
  }

  static async readFile(filename) {
    try {
      const content = await fs.readFile(filename, 'utf8');
      return `📄 File '${filename}' (${content.length} characters):\n\n${content}`;
    } catch (error) {
      throw new Error(`Failed to read file '${filename}': ${error.message}`);
    }
  }

  static async editFile(filename, oldText, newText) {
    try {
      const content = await fs.readFile(filename, 'utf8');
      const newContent = content.replace(oldText, newText);
      await fs.writeFile(filename, newContent, 'utf8');
      return `✏️ File '${filename}' edited successfully (replaced "${oldText.slice(0,50)}...")`;
    } catch (error) {
      throw new Error(`Failed to edit file '${filename}': ${error.message}`);
    }
  }

  static async listFiles(directory = '.') {
    try {
      const files = await fs.readdir(directory, { withFileTypes: true });
      const fileList = files.map(file => 
        file.isDirectory() ? `📁 ${file.name}/` : `📄 ${file.name}`
      ).join('\n');
      return `📂 Files in '${directory}':\n\n${fileList}`;
    } catch (error) {
      throw new Error(`Failed to list files in '${directory}': ${error.message}`);
    }
  }

  static async execute(toolName, args) {
    switch (toolName) {
      case 'write_file':
        return await this.writeFile(args.filename, args.content);
      case 'read_file':
        return await this.readFile(args.filename);
      case 'edit_file':
        return await this.editFile(args.filename, args.old_text, args.new_text);
      case 'list_files':
        return await this.listFiles(args.directory);
      default:
        throw new Error(`Unknown file tool: ${toolName}`);
    }
  }
}

module.exports = FileTools;