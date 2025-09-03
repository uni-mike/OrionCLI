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
      },
      {
        type: 'function',
        function: {
          name: 'delete_file',
          description: 'Delete a file (requires confirmation)',
          parameters: {
            type: 'object',
            properties: {
              filename: { type: 'string', description: 'The name of the file to delete' },
              force: { type: 'boolean', description: 'Skip confirmation (default: false)' }
            },
            required: ['filename']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_file',
          description: 'Update a file by appending or prepending content',
          parameters: {
            type: 'object',
            properties: {
              filename: { type: 'string', description: 'The name of the file to update' },
              content: { type: 'string', description: 'The content to add' },
              mode: { type: 'string', enum: ['append', 'prepend'], description: 'Where to add content (default: append)' }
            },
            required: ['filename', 'content']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'file_exists',
          description: 'Check if a file exists',
          parameters: {
            type: 'object',
            properties: {
              filename: { type: 'string', description: 'The name of the file to check' }
            },
            required: ['filename']
          }
        }
      }
    ];
  }

  static async writeFile(filename, content) {
    try {
      await fs.writeFile(filename, content, 'utf8');
      return { output: `✅ File '${filename}' created successfully (${content.length} characters)` };
    } catch (error) {
      return { error: `Failed to write file '${filename}': ${error.message}` };
    }
  }

  static async readFile(filename) {
    try {
      const content = await fs.readFile(filename, 'utf8');
      return { output: `📄 File '${filename}' (${content.length} characters):\n\n${content}` };
    } catch (error) {
      return { error: `Failed to read file '${filename}': ${error.message}` };
    }
  }

  static async editFile(filename, oldText, newText) {
    try {
      const content = await fs.readFile(filename, 'utf8');
      const newContent = content.replace(oldText, newText);
      await fs.writeFile(filename, newContent, 'utf8');
      return { output: `✏️ File '${filename}' edited successfully (replaced "${oldText.slice(0,50)}...")` };
    } catch (error) {
      return { error: `Failed to edit file '${filename}': ${error.message}` };
    }
  }

  static async listFiles(directory = '.') {
    try {
      const files = await fs.readdir(directory, { withFileTypes: true });
      const fileList = files.map(file => 
        file.isDirectory() ? `📁 ${file.name}/` : `📄 ${file.name}`
      ).join('\n');
      return { output: `📂 Files in '${directory}':\n\n${fileList}` };
    } catch (error) {
      return { error: `Failed to list files in '${directory}': ${error.message}` };
    }
  }

  static async deleteFile(filename, force = false) {
    try {
      // Check if file exists first
      const exists = await this.fileExists(filename);
      if (!exists) {
        return { error: `❌ File '${filename}' does not exist` };
      }

      // If not forcing, return a confirmation request
      if (!force) {
        return { 
          output: `⚠️ Are you sure you want to delete '${filename}'? This action cannot be undone.\n\nTo confirm, use the delete_file command with force: true`,
          needsConfirmation: true 
        };
      }

      await fs.unlink(filename);
      return { output: `🗑️ File '${filename}' has been successfully deleted` };
    } catch (error) {
      return { error: `Failed to delete file '${filename}': ${error.message}` };
    }
  }

  static async updateFile(filename, content, mode = 'append') {
    try {
      const exists = await this.fileExists(filename);
      if (!exists) {
        return { error: `❌ File '${filename}' does not exist. Use write_file to create it first.` };
      }

      const currentContent = await fs.readFile(filename, 'utf8');
      let newContent;
      
      if (mode === 'prepend') {
        newContent = content + '\n' + currentContent;
      } else {
        newContent = currentContent + '\n' + content;
      }
      
      await fs.writeFile(filename, newContent, 'utf8');
      return { output: `📝 File '${filename}' updated successfully (${mode}ed ${content.length} characters)` };
    } catch (error) {
      return { error: `Failed to update file '${filename}': ${error.message}` };
    }
  }

  static async fileExists(filename) {
    try {
      await fs.access(filename);
      return true;
    } catch {
      return false;
    }
  }

  static async checkFileExists(filename) {
    try {
      const exists = await this.fileExists(filename);
      if (exists) {
        const stats = await fs.stat(filename);
        const size = stats.size;
        const modified = stats.mtime.toISOString();
        return { output: `✅ File '${filename}' exists\n  Size: ${size} bytes\n  Last modified: ${modified}` };
      } else {
        return { output: `❌ File '${filename}' does not exist` };
      }
    } catch (error) {
      return { error: `Failed to check file '${filename}': ${error.message}` };
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
      case 'delete_file':
        return await this.deleteFile(args.filename, args.force);
      case 'update_file':
        return await this.updateFile(args.filename, args.content, args.mode);
      case 'file_exists':
        return await this.checkFileExists(args.filename);
      default:
        throw new Error(`Unknown file tool: ${toolName}`);
    }
  }
}

module.exports = FileTools;