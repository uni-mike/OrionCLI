/**
 * Permission Manager for OrionCLI
 * Similar to Claude Code's permission system for auto-execution
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class PermissionManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.orion');
    this.configFile = path.join(this.configDir, 'permissions.json');
    this.sessionPermissions = new Map(); // Temporary session permissions
    this.permissions = null;
    this.loadPermissions();
  }

  /**
   * Load permissions from config file
   */
  async loadPermissions() {
    try {
      // Ensure config directory exists
      await fs.mkdir(this.configDir, { recursive: true });
      
      // Try to load existing permissions
      const data = await fs.readFile(this.configFile, 'utf8');
      this.permissions = JSON.parse(data);
    } catch (error) {
      // Initialize with default permissions
      this.permissions = {
        version: '1.0.0',
        rules: {
          // File operations
          'read_file': { default: 'allow', patterns: [] },
          'list_files': { default: 'allow', patterns: [] },
          'file_exists': { default: 'allow', patterns: [] },
          'view_file': { default: 'allow', patterns: [] },
          
          // Write operations (more sensitive)
          'write_file': { default: 'ask', patterns: [] },
          'create_file': { default: 'ask', patterns: [] },
          'edit_file': { default: 'ask', patterns: [] },
          'str_replace_editor': { default: 'ask', patterns: [] },
          'delete_file': { default: 'ask', patterns: [] },
          
          // Git operations
          'git_status': { default: 'allow', patterns: [] },
          'git_diff': { default: 'allow', patterns: [] },
          'git_log': { default: 'allow', patterns: [] },
          'git_branch': { default: 'allow', patterns: [] },
          'git_commit': { default: 'ask', patterns: [] },
          'git_push': { default: 'ask', patterns: [] },
          'git_pull': { default: 'ask', patterns: [] },
          
          // System operations
          'execute_bash': { default: 'ask', patterns: [] },
          'system_info': { default: 'allow', patterns: [] },
          'process_list': { default: 'allow', patterns: [] },
          
          // Docker operations
          'docker_ps': { default: 'allow', patterns: [] },
          'docker_images': { default: 'allow', patterns: [] },
          'docker_run': { default: 'ask', patterns: [] },
          'docker_stop': { default: 'ask', patterns: [] },
          'docker_exec': { default: 'ask', patterns: [] },
          
          // SSH operations (very sensitive)
          'ssh_connect': { default: 'ask', patterns: [] },
          'scp_transfer': { default: 'ask', patterns: [] },
          
          // Database operations
          'db_query': { default: 'ask', patterns: [] },
          'db_backup': { default: 'ask', patterns: [] },
          'db_restore': { default: 'ask', patterns: [] }
        },
        
        // Pattern-based rules (like Claude Code)
        patterns: {
          allow: [],
          deny: [],
          ask: []
        },
        
        // Session rules
        sessionRules: {
          maxDuration: 3600000, // 1 hour
          allowPatterns: true
        }
      };
      
      await this.savePermissions();
    }
  }

  /**
   * Save permissions to config file
   */
  async savePermissions() {
    try {
      await fs.writeFile(
        this.configFile,
        JSON.stringify(this.permissions, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save permissions:', error);
    }
  }

  /**
   * Check if a tool execution is allowed
   */
  async checkPermission(toolName, args = {}) {
    // Build context for permission check
    const context = {
      tool: toolName,
      args: args,
      timestamp: Date.now()
    };

    // Check session permissions first
    const sessionKey = this.getSessionKey(toolName, args);
    if (this.sessionPermissions.has(sessionKey)) {
      const sessionPerm = this.sessionPermissions.get(sessionKey);
      if (sessionPerm.expires > Date.now()) {
        return sessionPerm.decision;
      } else {
        this.sessionPermissions.delete(sessionKey);
      }
    }

    // Check pattern-based rules
    const patternDecision = this.checkPatterns(context);
    if (patternDecision !== null) {
      return patternDecision;
    }

    // Check tool-specific rules
    const toolRule = this.permissions.rules[toolName];
    if (toolRule) {
      // Check tool-specific patterns
      for (const pattern of toolRule.patterns) {
        if (this.matchesPattern(context, pattern)) {
          return pattern.decision;
        }
      }
      
      // Use default rule
      return toolRule.default;
    }

    // Default to asking for unknown tools
    return 'ask';
  }

  /**
   * Check pattern-based rules
   */
  checkPatterns(context) {
    // Check deny patterns first (highest priority)
    for (const pattern of this.permissions.patterns.deny) {
      if (this.matchesPattern(context, pattern)) {
        return 'deny';
      }
    }

    // Check allow patterns
    for (const pattern of this.permissions.patterns.allow) {
      if (this.matchesPattern(context, pattern)) {
        return 'allow';
      }
    }

    // Check ask patterns
    for (const pattern of this.permissions.patterns.ask) {
      if (this.matchesPattern(context, pattern)) {
        return 'ask';
      }
    }

    return null;
  }

  /**
   * Check if context matches a pattern
   */
  matchesPattern(context, pattern) {
    // Pattern matching logic
    if (typeof pattern === 'string') {
      // Simple string pattern
      return context.tool === pattern;
    }

    if (pattern.tool && context.tool !== pattern.tool) {
      return false;
    }

    if (pattern.args) {
      for (const [key, value] of Object.entries(pattern.args)) {
        if (typeof value === 'string' && value.includes('*')) {
          // Wildcard pattern
          const regex = new RegExp(value.replace(/\*/g, '.*'));
          if (!regex.test(context.args[key])) {
            return false;
          }
        } else if (context.args[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Add a new permission rule
   */
  async addPermission(toolName, decision, pattern = null, duration = 'permanent') {
    if (duration === 'session') {
      // Add session permission
      const key = this.getSessionKey(toolName, pattern?.args || {});
      this.sessionPermissions.set(key, {
        decision: decision,
        expires: Date.now() + this.permissions.sessionRules.maxDuration
      });
      return;
    }

    if (duration === 'permanent') {
      if (pattern) {
        // Add pattern-based rule
        const patternRule = {
          tool: toolName,
          ...pattern,
          decision: decision
        };

        if (decision === 'allow') {
          this.permissions.patterns.allow.push(patternRule);
        } else if (decision === 'deny') {
          this.permissions.patterns.deny.push(patternRule);
        } else {
          this.permissions.patterns.ask.push(patternRule);
        }
      } else {
        // Update tool default
        if (!this.permissions.rules[toolName]) {
          this.permissions.rules[toolName] = { default: 'ask', patterns: [] };
        }
        this.permissions.rules[toolName].default = decision;
      }

      await this.savePermissions();
    }
  }

  /**
   * Generate session key for caching
   */
  getSessionKey(toolName, args) {
    const argStr = Object.entries(args)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    return `${toolName}:${argStr}`;
  }

  /**
   * Format permission request for display
   */
  formatPermissionRequest(toolName, args) {
    const descriptions = {
      'write_file': `create or modify file: ${args.filename || args.path}`,
      'delete_file': `delete file: ${args.filename || args.path}`,
      'execute_bash': `run command: ${args.command}`,
      'git_commit': `commit changes with message: ${args.message}`,
      'git_push': `push changes to remote repository`,
      'docker_run': `run Docker container: ${args.image}`,
      'ssh_connect': `connect to SSH server: ${args.host}`,
      'db_query': `execute database query`
    };

    return descriptions[toolName] || `execute ${toolName}`;
  }

  /**
   * Get permission statistics
   */
  getStats() {
    const stats = {
      totalRules: 0,
      allowRules: 0,
      denyRules: 0,
      askRules: 0,
      sessionPermissions: this.sessionPermissions.size
    };

    // Count tool rules
    for (const [tool, rule] of Object.entries(this.permissions.rules)) {
      stats.totalRules++;
      if (rule.default === 'allow') stats.allowRules++;
      else if (rule.default === 'deny') stats.denyRules++;
      else stats.askRules++;
    }

    // Count pattern rules
    stats.totalRules += this.permissions.patterns.allow.length;
    stats.totalRules += this.permissions.patterns.deny.length;
    stats.totalRules += this.permissions.patterns.ask.length;

    return stats;
  }

  /**
   * Clear session permissions
   */
  clearSession() {
    this.sessionPermissions.clear();
  }

  /**
   * Export permissions for backup
   */
  async exportPermissions() {
    return JSON.stringify(this.permissions, null, 2);
  }

  /**
   * Import permissions from backup
   */
  async importPermissions(data) {
    try {
      const imported = JSON.parse(data);
      this.permissions = imported;
      await this.savePermissions();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = PermissionManager;