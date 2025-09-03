/**
 * Git Operations Tools
 */
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class GitTools {
  static getDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'git_status',
          description: 'Show git repository status',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      },
      {
        type: 'function',
        function: {
          name: 'git_diff',
          description: 'Show git diff',
          parameters: {
            type: 'object',
            properties: {
              filename: { type: 'string', description: 'Specific file to diff' }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'git_commit',
          description: 'Create a git commit',
          parameters: {
            type: 'object',
            properties: {
              message: { type: 'string', description: 'Commit message' },
              files: { type: 'array', items: { type: 'string' }, description: 'Files to commit' }
            },
            required: ['message']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'git_log',
          description: 'Show git commit history',
          parameters: {
            type: 'object',
            properties: {
              count: { type: 'number', description: 'Number of commits to show' },
              oneline: { type: 'boolean', description: 'Show compact one-line format' }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'git_branch',
          description: 'Git branch operations',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', description: 'list, create, delete, checkout' },
              branch_name: { type: 'string', description: 'Branch name for create/delete/checkout' }
            },
            required: ['action']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'git_push',
          description: 'Push commits to remote repository',
          parameters: {
            type: 'object',
            properties: {
              remote: { type: 'string', description: 'Remote name (default: origin)' },
              branch: { type: 'string', description: 'Branch name (default: current)' }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'git_pull',
          description: 'Pull changes from remote repository',
          parameters: {
            type: 'object',
            properties: {
              remote: { type: 'string', description: 'Remote name (default: origin)' },
              branch: { type: 'string', description: 'Branch name (default: current)' }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'git_stash',
          description: 'Git stash operations',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', description: 'save, pop, list, show' },
              message: { type: 'string', description: 'Stash message for save action' }
            },
            required: ['action']
          }
        }
      }
    ];
  }

  static async execCommand(command) {
    try {
      const { stdout } = await execAsync(command);
      return stdout.trim() || 'Command executed successfully';
    } catch (error) {
      throw new Error(error.stderr || error.message);
    }
  }

  static async gitStatus() {
    return await this.execCommand('git status');
  }

  static async gitDiff(filename) {
    const command = filename ? `git diff ${filename}` : 'git diff';
    return await this.execCommand(command);
  }

  static async gitCommit(message, files) {
    try {
      if (files && files.length > 0) {
        await this.execCommand(`git add ${files.join(' ')}`);
      } else {
        await this.execCommand('git add .');
      }
      return await this.execCommand(`git commit -m "${message}"`);
    } catch (error) {
      throw new Error(`Git commit failed: ${error.message}`);
    }
  }

  static async gitLog(count = 10, oneline = false) {
    const format = oneline ? '--oneline' : '';
    const command = `git log ${format} -${count}`;
    return await this.execCommand(command);
  }

  static async gitBranch(action, branchName) {
    let command;
    switch (action) {
      case 'list':
        command = 'git branch -a';
        break;
      case 'create':
        if (!branchName) throw new Error('Branch name required for create action');
        command = `git checkout -b ${branchName}`;
        break;
      case 'delete':
        if (!branchName) throw new Error('Branch name required for delete action');
        command = `git branch -d ${branchName}`;
        break;
      case 'checkout':
        if (!branchName) throw new Error('Branch name required for checkout action');
        command = `git checkout ${branchName}`;
        break;
      default:
        throw new Error(`Unknown branch action: ${action}`);
    }
    return await this.execCommand(command);
  }

  static async gitPush(remote = 'origin', branch) {
    const command = branch ? `git push ${remote} ${branch}` : `git push ${remote}`;
    return await this.execCommand(command);
  }

  static async gitPull(remote = 'origin', branch) {
    const command = branch ? `git pull ${remote} ${branch}` : `git pull ${remote}`;
    return await this.execCommand(command);
  }

  static async gitStash(action, message) {
    let command;
    switch (action) {
      case 'save':
        command = message ? `git stash save "${message}"` : 'git stash';
        break;
      case 'pop':
        command = 'git stash pop';
        break;
      case 'list':
        command = 'git stash list';
        break;
      case 'show':
        command = 'git stash show';
        break;
      default:
        throw new Error(`Unknown stash action: ${action}`);
    }
    return await this.execCommand(command);
  }

  static async execute(toolName, args) {
    switch (toolName) {
      case 'git_status':
        return await this.gitStatus();
      case 'git_diff':
        return await this.gitDiff(args.filename);
      case 'git_commit':
        return await this.gitCommit(args.message, args.files);
      case 'git_log':
        return await this.gitLog(args.count, args.oneline);
      case 'git_branch':
        return await this.gitBranch(args.action, args.branch_name);
      case 'git_push':
        return await this.gitPush(args.remote, args.branch);
      case 'git_pull':
        return await this.gitPull(args.remote, args.branch);
      case 'git_stash':
        return await this.gitStash(args.action, args.message);
      default:
        throw new Error(`Unknown git tool: ${toolName}`);
    }
  }
}

module.exports = GitTools;