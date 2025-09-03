/**
 * Docker Operations Tools
 */
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class DockerTools {
  static getDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'docker_ps',
          description: 'List Docker containers',
          parameters: {
            type: 'object',
            properties: {
              all: { type: 'boolean', description: 'Show all containers (default: running only)' }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'docker_images',
          description: 'List Docker images',
          parameters: {
            type: 'object',
            properties: {
              filter: { type: 'string', description: 'Filter images by name or tag' }
            },
            required: []
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'docker_run',
          description: 'Run a Docker container',
          parameters: {
            type: 'object',
            properties: {
              image: { type: 'string', description: 'Docker image name' },
              name: { type: 'string', description: 'Container name' },
              ports: { type: 'string', description: 'Port mapping (e.g., "8080:80")' },
              detach: { type: 'boolean', description: 'Run in detached mode' },
              environment: { type: 'object', description: 'Environment variables' }
            },
            required: ['image']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'docker_stop',
          description: 'Stop Docker container(s)',
          parameters: {
            type: 'object',
            properties: {
              container: { type: 'string', description: 'Container name or ID' }
            },
            required: ['container']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'docker_logs',
          description: 'Get container logs',
          parameters: {
            type: 'object',
            properties: {
              container: { type: 'string', description: 'Container name or ID' },
              follow: { type: 'boolean', description: 'Follow log output' },
              tail: { type: 'number', description: 'Number of lines to show from end' }
            },
            required: ['container']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'docker_exec',
          description: 'Execute command in running container',
          parameters: {
            type: 'object',
            properties: {
              container: { type: 'string', description: 'Container name or ID' },
              command: { type: 'string', description: 'Command to execute' },
              interactive: { type: 'boolean', description: 'Interactive mode' }
            },
            required: ['container', 'command']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'docker_compose',
          description: 'Docker Compose operations',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', description: 'up, down, ps, logs, restart' },
              service: { type: 'string', description: 'Specific service name' },
              file: { type: 'string', description: 'Compose file path' }
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

  static async dockerPs(all = false) {
    const command = all ? 'docker ps -a' : 'docker ps';
    return await this.execCommand(command);
  }

  static async dockerImages(filter) {
    let command = 'docker images';
    if (filter) {
      command += ` | grep ${filter}`;
    }
    return await this.execCommand(command);
  }

  static async dockerRun(image, name, ports, detach = true, environment) {
    let command = 'docker run';
    
    if (detach) command += ' -d';
    if (name) command += ` --name ${name}`;
    if (ports) command += ` -p ${ports}`;
    
    if (environment) {
      for (const [key, value] of Object.entries(environment)) {
        command += ` -e ${key}=${value}`;
      }
    }
    
    command += ` ${image}`;
    return await this.execCommand(command);
  }

  static async dockerStop(container) {
    const command = `docker stop ${container}`;
    return await this.execCommand(command);
  }

  static async dockerLogs(container, follow = false, tail) {
    let command = `docker logs`;
    if (follow) command += ' -f';
    if (tail) command += ` --tail ${tail}`;
    command += ` ${container}`;
    
    return await this.execCommand(command);
  }

  static async dockerExec(container, dockerCommand, interactive = false) {
    let command = 'docker exec';
    if (interactive) command += ' -it';
    command += ` ${container} ${dockerCommand}`;
    
    return await this.execCommand(command);
  }

  static async dockerCompose(action, service, file) {
    let command = 'docker-compose';
    if (file) command += ` -f ${file}`;
    command += ` ${action}`;
    if (service) command += ` ${service}`;
    
    return await this.execCommand(command);
  }

  static async execute(toolName, args) {
    switch (toolName) {
      case 'docker_ps':
        return await this.dockerPs(args.all);
      case 'docker_images':
        return await this.dockerImages(args.filter);
      case 'docker_run':
        return await this.dockerRun(args.image, args.name, args.ports, args.detach, args.environment);
      case 'docker_stop':
        return await this.dockerStop(args.container);
      case 'docker_logs':
        return await this.dockerLogs(args.container, args.follow, args.tail);
      case 'docker_exec':
        return await this.dockerExec(args.container, args.command, args.interactive);
      case 'docker_compose':
        return await this.dockerCompose(args.action, args.service, args.file);
      default:
        throw new Error(`Unknown Docker tool: ${toolName}`);
    }
  }
}

module.exports = DockerTools;