/**
 * Advanced File Tools - Smart capabilities from grok-cli and beyond
 */
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AdvancedFileTools {
  static getDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'view_file',
          description: 'View file contents with line numbers and range support',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path to view' },
              start_line: { type: 'number', description: 'Start line (optional)' },
              end_line: { type: 'number', description: 'End line (optional)' }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'str_replace_editor',
          description: 'Smart string replacement with fuzzy matching for multi-line content',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File to edit' },
              old_str: { type: 'string', description: 'String to find (supports multi-line)' },
              new_str: { type: 'string', description: 'Replacement string' },
              replace_all: { type: 'boolean', description: 'Replace all occurrences' }
            },
            required: ['path', 'old_str', 'new_str']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_file',
          description: 'Create a new file with optional content',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path for new file' },
              content: { type: 'string', description: 'Initial content' },
              force: { type: 'boolean', description: 'Overwrite if exists' }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_files',
          description: 'Search for files by pattern or content (like ripgrep)',
          parameters: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'Search pattern (regex supported)' },
              directory: { type: 'string', description: 'Directory to search in' },
              file_pattern: { type: 'string', description: 'File name pattern (glob)' },
              case_sensitive: { type: 'boolean', description: 'Case sensitive search' },
              max_results: { type: 'number', description: 'Maximum results to return' }
            },
            required: ['pattern']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'grep_content',
          description: 'Search file contents with context lines',
          parameters: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'Search pattern' },
              path: { type: 'string', description: 'File or directory to search' },
              before: { type: 'number', description: 'Lines before match' },
              after: { type: 'number', description: 'Lines after match' }
            },
            required: ['pattern', 'path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'file_diff',
          description: 'Show differences between two files',
          parameters: {
            type: 'object',
            properties: {
              file1: { type: 'string', description: 'First file' },
              file2: { type: 'string', description: 'Second file' },
              context: { type: 'number', description: 'Context lines' }
            },
            required: ['file1', 'file2']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'bulk_rename',
          description: 'Rename multiple files using patterns',
          parameters: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'File pattern to match' },
              rename_pattern: { type: 'string', description: 'New name pattern' },
              directory: { type: 'string', description: 'Directory to operate in' },
              dry_run: { type: 'boolean', description: 'Preview changes without applying' }
            },
            required: ['pattern', 'rename_pattern']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'file_checksum',
          description: 'Calculate file checksum (MD5, SHA256)',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path' },
              algorithm: { type: 'string', enum: ['md5', 'sha1', 'sha256'], description: 'Hash algorithm' }
            },
            required: ['path']
          }
        }
      }
    ];
  }

  static async viewFile(filePath, startLine, endLine) {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(filePath, { withFileTypes: true });
        const listing = files.map(f => {
          const prefix = f.isDirectory() ? '📁' : '📄';
          return `${prefix} ${f.name}`;
        }).join('\n');
        return { output: `Directory: ${filePath}\n\n${listing}` };
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      if (startLine || endLine) {
        const start = (startLine || 1) - 1;
        const end = endLine || lines.length;
        const selected = lines.slice(start, end);
        const numbered = selected.map((line, idx) => 
          `${String(start + idx + 1).padStart(4)}: ${line}`
        ).join('\n');
        return { output: `📄 ${filePath} [lines ${start + 1}-${end}]:\n\n${numbered}` };
      }
      
      // Show first 50 lines with line numbers
      const display = lines.slice(0, 50);
      const numbered = display.map((line, idx) => 
        `${String(idx + 1).padStart(4)}: ${line}`
      ).join('\n');
      const more = lines.length > 50 ? `\n... +${lines.length - 50} more lines` : '';
      
      return { output: `📄 ${filePath} (${lines.length} lines):\n\n${numbered}${more}` };
    } catch (error) {
      return { error: `Failed to view file: ${error.message}` };
    }
  }

  static async strReplaceEditor(filePath, oldStr, newStr, replaceAll = false) {
    try {
      let content = await fs.readFile(filePath, 'utf8');
      
      // Handle multi-line strings with fuzzy matching
      if (oldStr.includes('\n')) {
        const fuzzyMatch = this.findFuzzyMatch(content, oldStr);
        if (fuzzyMatch) {
          oldStr = fuzzyMatch;
        }
      }
      
      if (!content.includes(oldStr)) {
        return { error: `String not found in file: "${oldStr.slice(0, 50)}..."` };
      }
      
      const occurrences = (content.match(new RegExp(oldStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      
      if (replaceAll) {
        content = content.replaceAll(oldStr, newStr);
      } else {
        content = content.replace(oldStr, newStr);
      }
      
      await fs.writeFile(filePath, content, 'utf8');
      
      return { 
        output: `✏️ Replaced ${replaceAll ? 'all' : '1'} of ${occurrences} occurrence(s) in ${filePath}` 
      };
    } catch (error) {
      return { error: `Failed to edit file: ${error.message}` };
    }
  }

  static findFuzzyMatch(content, target) {
    // Normalize whitespace for fuzzy matching
    const normalizedTarget = target.replace(/\s+/g, ' ').trim();
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const chunk = lines.slice(i, i + target.split('\n').length).join('\n');
      const normalizedChunk = chunk.replace(/\s+/g, ' ').trim();
      
      if (normalizedChunk.includes(normalizedTarget)) {
        return chunk;
      }
    }
    
    return null;
  }

  static async createFile(filePath, content = '', force = false) {
    try {
      if (!force && await this.fileExists(filePath)) {
        return { error: `File already exists: ${filePath}. Use force:true to overwrite.` };
      }
      
      // Create directory if needed
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(filePath, content, 'utf8');
      return { output: `✅ Created file: ${filePath} (${content.length} characters)` };
    } catch (error) {
      return { error: `Failed to create file: ${error.message}` };
    }
  }

  static async searchFiles(pattern, directory = '.', filePattern = '*', caseSensitive = false, maxResults = 100) {
    try {
      const results = [];
      const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
      
      async function searchDir(dir) {
        if (results.length >= maxResults) return;
        
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (results.length >= maxResults) break;
          
          const fullPath = path.join(dir, entry.name);
          
          // Skip node_modules and hidden directories
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await searchDir(fullPath);
          } else if (entry.isFile()) {
            try {
              const content = await fs.readFile(fullPath, 'utf8');
              const matches = content.match(regex);
              
              if (matches) {
                results.push({
                  file: fullPath,
                  matches: matches.length,
                  preview: this.getMatchPreview(content, pattern)
                });
              }
            } catch {
              // Skip files that can't be read
            }
          }
        }
      }
      
      await searchDir(directory);
      
      if (results.length === 0) {
        return { output: `No matches found for "${pattern}"` };
      }
      
      const output = results.map(r => 
        `📄 ${r.file} (${r.matches} matches)\n   ${r.preview}`
      ).join('\n\n');
      
      return { output: `Found ${results.length} files:\n\n${output}` };
    } catch (error) {
      return { error: `Search failed: ${error.message}` };
    }
  }

  static getMatchPreview(content, pattern) {
    const lines = content.split('\n');
    const regex = new RegExp(pattern, 'i');
    
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        return lines[i].trim().slice(0, 80) + (lines[i].length > 80 ? '...' : '');
      }
    }
    
    return '';
  }

  static async grepContent(pattern, filePath, before = 0, after = 0) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const regex = new RegExp(pattern, 'gi');
      const matches = [];
      
      lines.forEach((line, idx) => {
        if (regex.test(line)) {
          const start = Math.max(0, idx - before);
          const end = Math.min(lines.length - 1, idx + after);
          const context = lines.slice(start, end + 1).map((l, i) => {
            const lineNum = start + i + 1;
            const marker = (start + i === idx) ? '>' : ' ';
            return `${marker} ${String(lineNum).padStart(4)}: ${l}`;
          }).join('\n');
          
          matches.push(context);
        }
      });
      
      if (matches.length === 0) {
        return { output: `No matches found for "${pattern}" in ${filePath}` };
      }
      
      return { output: `Found ${matches.length} matches:\n\n${matches.join('\n---\n')}` };
    } catch (error) {
      return { error: `Grep failed: ${error.message}` };
    }
  }

  static async fileDiff(file1, file2, contextLines = 3) {
    try {
      const content1 = await fs.readFile(file1, 'utf8');
      const content2 = await fs.readFile(file2, 'utf8');
      
      const lines1 = content1.split('\n');
      const lines2 = content2.split('\n');
      
      let diff = `Comparing: ${file1} vs ${file2}\n\n`;
      let differences = 0;
      
      const maxLines = Math.max(lines1.length, lines2.length);
      
      for (let i = 0; i < maxLines; i++) {
        if (lines1[i] !== lines2[i]) {
          differences++;
          diff += `Line ${i + 1}:\n`;
          diff += `- ${lines1[i] || '(empty)'}\n`;
          diff += `+ ${lines2[i] || '(empty)'}\n\n`;
        }
      }
      
      if (differences === 0) {
        return { output: 'Files are identical' };
      }
      
      return { output: `${differences} differences found:\n\n${diff}` };
    } catch (error) {
      return { error: `Diff failed: ${error.message}` };
    }
  }

  static async fileChecksum(filePath, algorithm = 'sha256') {
    try {
      const content = await fs.readFile(filePath);
      const hash = crypto.createHash(algorithm);
      hash.update(content);
      const checksum = hash.digest('hex');
      
      const stats = await fs.stat(filePath);
      
      return { 
        output: `File: ${filePath}\nSize: ${stats.size} bytes\n${algorithm.toUpperCase()}: ${checksum}` 
      };
    } catch (error) {
      return { error: `Checksum failed: ${error.message}` };
    }
  }

  static async bulkRename(pattern, renamePattern, directory = '.', dryRun = false) {
    try {
      const files = await fs.readdir(directory);
      const regex = new RegExp(pattern);
      const toRename = [];
      
      for (const file of files) {
        if (regex.test(file)) {
          const newName = file.replace(regex, renamePattern);
          toRename.push({ old: file, new: newName });
        }
      }
      
      if (toRename.length === 0) {
        return { output: 'No files matched the pattern' };
      }
      
      if (dryRun) {
        const preview = toRename.map(r => `${r.old} → ${r.new}`).join('\n');
        return { output: `Dry run - would rename ${toRename.length} files:\n\n${preview}` };
      }
      
      for (const rename of toRename) {
        await fs.rename(
          path.join(directory, rename.old),
          path.join(directory, rename.new)
        );
      }
      
      return { output: `✅ Renamed ${toRename.length} files successfully` };
    } catch (error) {
      return { error: `Bulk rename failed: ${error.message}` };
    }
  }

  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async execute(toolName, args) {
    switch (toolName) {
      case 'view_file':
        return await this.viewFile(args.path, args.start_line, args.end_line);
      case 'str_replace_editor':
        return await this.strReplaceEditor(args.path, args.old_str, args.new_str, args.replace_all);
      case 'create_file':
        return await this.createFile(args.path, args.content, args.force);
      case 'search_files':
        return await this.searchFiles(args.pattern, args.directory, args.file_pattern, args.case_sensitive, args.max_results);
      case 'grep_content':
        return await this.grepContent(args.pattern, args.path, args.before, args.after);
      case 'file_diff':
        return await this.fileDiff(args.file1, args.file2, args.context);
      case 'bulk_rename':
        return await this.bulkRename(args.pattern, args.rename_pattern, args.directory, args.dry_run);
      case 'file_checksum':
        return await this.fileChecksum(args.path, args.algorithm);
      default:
        throw new Error(`Unknown advanced file tool: ${toolName}`);
    }
  }
}

module.exports = AdvancedFileTools;