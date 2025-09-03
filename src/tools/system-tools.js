/**
 * System Operations Tools
 */
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SystemTools {
  static getDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'system_info',
          description: 'Get system information',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      },
      {
        type: 'function',
        function: {
          name: 'process_list',
          description: 'List running processes',
          parameters: {
            type: 'object',
            properties: {
              filter: { type: 'string', description: 'Filter processes by name' }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'disk_usage',
          description: 'Show disk usage information',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to check (default: current)' }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'network_info',
          description: 'Get network configuration and status',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      },
      {
        type: 'function',
        function: {
          name: 'memory_info',
          description: 'Get memory usage information',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      },
      {
        type: 'function',
        function: {
          name: 'cpu_info',
          description: 'Get CPU information and usage',
          parameters: { type: 'object', properties: {}, required: [] }
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

  static async getSystemInfo() {
    const platform = process.platform;
    const arch = process.arch;
    const nodeVersion = process.version;
    const uptime = Math.floor(process.uptime());
    
    return `💻 System Information:\n\n` +
           `Platform: ${platform}\n` +
           `Architecture: ${arch}\n` +
           `Node.js: ${nodeVersion}\n` +
           `Uptime: ${uptime}s`;
  }

  static async getProcessList(filter) {
    const command = process.platform === 'win32' ? 'tasklist' :
                   filter ? `ps aux | grep ${filter}` : 'ps aux';
    return await this.execCommand(command);
  }

  static async getDiskUsage(path = '.') {
    const command = process.platform === 'win32' ? `dir "${path}"` : `du -sh "${path}" && df -h`;
    return await this.execCommand(command);
  }

  static async getNetworkInfo() {
    const command = process.platform === 'win32' ? 'ipconfig /all' : 'ifconfig -a && netstat -rn';
    return await this.execCommand(command);
  }

  static async getMemoryInfo() {
    const command = process.platform === 'win32' ? 'systeminfo | findstr Memory' : 'free -h && cat /proc/meminfo | head -10';
    return await this.execCommand(command);
  }

  static async getCpuInfo() {
    const command = process.platform === 'win32' ? 'wmic cpu get name,maxclockspeed,numberofcores' : 'lscpu && cat /proc/cpuinfo | head -20';
    return await this.execCommand(command);
  }

  static async execute(toolName, args) {
    switch (toolName) {
      case 'system_info':
        return await this.getSystemInfo();
      case 'process_list':
        return await this.getProcessList(args.filter);
      case 'disk_usage':
        return await this.getDiskUsage(args.path);
      case 'network_info':
        return await this.getNetworkInfo();
      case 'memory_info':
        return await this.getMemoryInfo();
      case 'cpu_info':
        return await this.getCpuInfo();
      default:
        throw new Error(`Unknown system tool: ${toolName}`);
    }
  }
}

module.exports = SystemTools;