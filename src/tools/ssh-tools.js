/**
 * SSH Operations Tools
 */
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SSHTools {
  static getDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'ssh_connect',
          description: 'Connect to remote server via SSH and execute command',
          parameters: {
            type: 'object',
            properties: {
              host: { type: 'string', description: 'Remote host address' },
              user: { type: 'string', description: 'Username' },
              command: { type: 'string', description: 'Command to execute remotely' },
              port: { type: 'number', description: 'SSH port (default: 22)' }
            },
            required: ['host', 'user', 'command']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'scp_transfer',
          description: 'Transfer files via SCP',
          parameters: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Source file path' },
              destination: { type: 'string', description: 'Destination path (user@host:/path)' },
              direction: { type: 'string', description: 'upload or download' },
              port: { type: 'number', description: 'SSH port (default: 22)' }
            },
            required: ['source', 'destination', 'direction']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'ssh_keygen',
          description: 'Generate SSH key pair',
          parameters: {
            type: 'object',
            properties: {
              filename: { type: 'string', description: 'Key filename (default: id_rsa)' },
              type: { type: 'string', description: 'Key type: rsa, ed25519, ecdsa' },
              comment: { type: 'string', description: 'Key comment' }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'ssh_config',
          description: 'Manage SSH configuration',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', description: 'show, add, remove' },
              host_alias: { type: 'string', description: 'Host alias for add/remove' },
              config: { type: 'object', description: 'SSH config options' }
            },
            required: ['action']
          }
        }
      }
    ];
  }

  static async execCommand(command) {
    try {
      const { stdout, stderr } = await execAsync(command);
      return stdout.trim() || stderr.trim() || 'Command executed successfully';
    } catch (error) {
      throw new Error(error.stderr || error.message);
    }
  }

  static async sshConnect(host, user, command, port = 22) {
    const sshCommand = `ssh -p ${port} ${user}@${host} "${command}"`;
    return await this.execCommand(sshCommand);
  }

  static async scpTransfer(source, destination, direction, port = 22) {
    let command;
    if (direction === 'upload') {
      command = `scp -P ${port} "${source}" "${destination}"`;
    } else if (direction === 'download') {
      command = `scp -P ${port} "${destination}" "${source}"`;
    } else {
      throw new Error('Direction must be "upload" or "download"');
    }
    return await this.execCommand(command);
  }

  static async sshKeygen(filename = 'id_rsa', type = 'rsa', comment) {
    const commentArg = comment ? `-C "${comment}"` : '';
    const command = `ssh-keygen -t ${type} -f ~/.ssh/${filename} -N "" ${commentArg}`;
    return await this.execCommand(command);
  }

  static async sshConfig(action, hostAlias, config) {
    const configPath = '~/.ssh/config';
    
    switch (action) {
      case 'show':
        return await this.execCommand(`cat ${configPath} || echo "No SSH config found"`);
      
      case 'add':
        if (!hostAlias || !config) {
          throw new Error('Host alias and config required for add action');
        }
        const configBlock = `\nHost ${hostAlias}\n` +
          Object.entries(config).map(([key, value]) => `    ${key} ${value}`).join('\n');
        return await this.execCommand(`echo "${configBlock}" >> ${configPath}`);
      
      case 'remove':
        if (!hostAlias) {
          throw new Error('Host alias required for remove action');
        }
        // This is a simplified removal - in practice, you'd want more sophisticated parsing
        return await this.execCommand(`sed -i '/^Host ${hostAlias}$/,/^$/d' ${configPath}`);
      
      default:
        throw new Error(`Unknown SSH config action: ${action}`);
    }
  }

  static async execute(toolName, args) {
    switch (toolName) {
      case 'ssh_connect':
        return await this.sshConnect(args.host, args.user, args.command, args.port);
      case 'scp_transfer':
        return await this.scpTransfer(args.source, args.destination, args.direction, args.port);
      case 'ssh_keygen':
        return await this.sshKeygen(args.filename, args.type, args.comment);
      case 'ssh_config':
        return await this.sshConfig(args.action, args.host_alias, args.config);
      default:
        throw new Error(`Unknown SSH tool: ${toolName}`);
    }
  }
}

module.exports = SSHTools;