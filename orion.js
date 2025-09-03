#!/usr/bin/env node

/**
 * OrionCLI - Enhanced Azure OpenAI CLI
 * Based on original grok-cli architecture with all smart features
 */

const readline = require('readline');
const chalk = require('chalk');
const boxen = require('boxen');
const gradient = require('gradient-string');
const figlet = require('figlet');
const OpenAI = require('openai').default;
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const stripAnsi = require('strip-ansi');

// Load environment
require('dotenv').config();

// Beautiful ASCII art for ORION - restored!
const ORION_ASCII = `
   ███████╗ ██████╗ ██╗ ███████╗ ███╗   ██╗
   ██╔═══██╗██╔══██╗██║██╔═══██╗████╗  ██║
   ██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║
   ██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║
   ╚███████║██║  ██║██║╚███████║██║ ╚████║
    ╚══════╝╚═╝  ╚═╝╚═╝ ╚══════╝╚═╝  ╚═══╝
`;

const CONSTELLATION = `
       ✦ .  　　　　   　 　　　˚　　　　　　　　　　　　　　*　　　　　　   
      　　　　　　　　　　　　　　　.　　　　　　　　　　　　　　. 　　 　　　　　　　 
      ✦ 　　　　   　 　　　˚　　　　　　　　　　　　　　　*　　　　　　   　　　　　　　
      　 　　　　　　　　　　　　　.　　　　　　　　　　　　　　　　　　　　　　
      　　　　　　*　　　　　　　　　　　　　　　　　　　　　.　　　　　　　　　　　　　
             ✦ 　   　　　,　　　　　　　　　　　    　　　  　　　　　　　　　　　　　　
      　　.　　　　　　　　　　　　　.　　　ﾟ　  　　　.　　　　　　　　　　　　　　　　
        ,　　　　　　　.　　　　　　    　　　　 　　　　　　　　　　　　　　　　　　  
      　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　˚　　　　 　   　　
      　　　　　˚　　　　　　　　　　　　　　　ﾟ　　　　　.　　　　　　　　　　　　　　　.
`;

// Vibrant color palette
const colors = {
  primary: chalk.hex('#00D9FF'),     // Bright cyan
  secondary: chalk.hex('#FF6B9D'),   // Pink
  accent: chalk.hex('#FFE66D'),      // Yellow
  success: chalk.hex('#51FF76'),     // Bright green
  warning: chalk.hex('#FFA500'),     // Orange
  error: chalk.hex('#FF4757'),       // Red
  info: chalk.hex('#A29BFE'),        // Lavender
  text: chalk.hex('#FFFFFF'),        // White
  dim: chalk.hex('#8B8B8B'),         // Gray
  code: chalk.hex('#00FF88'),        // Mint green
  tool: chalk.hex('#FFD93D'),        // Gold
};

class OrionCLI {
  constructor() {
    this.messages = [];
    this.inputBuffer = '';
    this.cursorPosition = 0;
    this.history = [];
    this.historyIndex = -1;
    this.config = this.loadConfig();
    this.client = this.createClient();
    this.activeFile = null;
    this.autoEdit = false;
    this.isProcessing = false;
    this.terminalWidth = process.stdout.columns || 80;
    this.terminalHeight = process.stdout.rows || 30;
    this.lastRender = '';
    this.renderTimeout = null;
    this.sessionStartTime = Date.now();
  }

  loadConfig() {
    const model = process.env.MODEL || 'gpt-5-chat';
    const configs = {
      'gpt-5': {
        endpoint: 'https://mike-mazsz1c6-eastus2.openai.azure.com',
        deployment: 'gpt-5',
        key: process.env.ORION_DEFAULT_KEY,
        icon: '⚡',
        color: colors.accent,
        supportsTemperature: true
      },
      'gpt-5-chat': {
        endpoint: 'https://mike-mazsz1c6-eastus2.openai.azure.com',
        deployment: 'gpt-5-chat',
        key: process.env.ORION_DEFAULT_KEY,
        icon: '💬',
        color: colors.primary,
        supportsTemperature: true
      },
      'gpt-5-mini': {
        endpoint: 'https://mike-mazsz1c6-eastus2.openai.azure.com',
        deployment: 'gpt-5-mini',
        key: process.env.ORION_DEFAULT_KEY,
        icon: '🚀',
        color: colors.success,
        supportsTemperature: true
      },
      'o3': {
        endpoint: 'https://unipathai7556217047.openai.azure.com',
        deployment: 'o3',
        key: process.env.ORION_O3_KEY,
        icon: '🧠',
        color: colors.info,
        supportsTemperature: false // o3 doesn't support custom temperature
      },
      'gpt-4o': {
        endpoint: 'https://unipathai7556217047.openai.azure.com',
        deployment: 'gpt-4o',
        key: process.env.ORION_O3_KEY,
        icon: '👁',
        color: colors.secondary,
        supportsTemperature: true
      },
      'o4-mini': {
        endpoint: 'https://mike-mazsz1c6-eastus2.openai.azure.com',
        deployment: 'o4-mini',
        key: process.env.ORION_DEFAULT_KEY,
        icon: '⚡',
        color: colors.warning,
        supportsTemperature: true
      }
    };
    
    const config = configs[model] || configs['gpt-5-chat'];
    config.model = model;
    config.apiVersion = '2024-12-01-preview';
    return config;
  }

  createClient() {
    if (!this.config.key) {
      console.error(colors.error('\n❌ No API key found. Please check your .env file.\n'));
      process.exit(1);
    }
    
    return new OpenAI({
      apiKey: this.config.key,
      baseURL: `${this.config.endpoint}/openai/deployments/${this.config.deployment}`,
      defaultQuery: { 'api-version': this.config.apiVersion },
      defaultHeaders: { 'api-key': this.config.key }
    });
  }

  async start() {
    // Beautiful splash screen
    console.clear();
    this.showSplashScreen();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.setupTerminal();
    this.setupInput();
    this.render();
    
    // Welcome message
    this.addMessage('system', `Welcome to OrionCLI! Type ${colors.primary('/help')} for commands or start chatting.`);
    this.render();
  }

  showSplashScreen() {
    // Starfield background
    console.log(gradient(['#000428', '#004e92'])(CONSTELLATION));
    
    // Main logo with gradient
    const logoGradient = gradient(['#667eea', '#764ba2', '#f093fb']);
    console.log(logoGradient(ORION_ASCII));
    
    // Subtitle
    console.log('\n' + colors.primary.bold('                     Enhanced Azure OpenAI CLI'));
    console.log(colors.dim('                   Powered by cutting-edge AI models'));
    
    // Loading
    console.log('\n\n');
    console.log(colors.info('        Initializing neural pathways...'));
  }

  setupTerminal() {
    // Handle terminal resize
    process.stdout.on('resize', () => {
      this.terminalWidth = process.stdout.columns || 80;
      this.terminalHeight = process.stdout.rows || 30;
      this.render();
    });
    
    // Cleanup on exit
    process.on('exit', () => {
      process.stdout.write('\x1B[?25h'); // Show cursor
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    });
  }

  setupInput() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', async (key) => {
      if (this.isProcessing && key !== '\x03' && key !== '\x1B') return;
      
      // Check for Shift+Tab first (sequence: ESC[Z)
      if (key === '\x1B[Z') {
        this.toggleAutoEdit();
        this.scheduleRender();
        return;
      }
      
      const code = key.charCodeAt(0);
      
      switch (code) {
        case 3: // Ctrl+C
          this.exit();
          break;
        case 13: // Enter
          await this.handleEnter();
          break;
        case 127: // Backspace
        case 8:
          this.handleBackspace();
          break;
        case 9: // Tab
          // Regular Tab - could add tab completion here later
          break;
        case 27: // Escape sequences
          this.handleEscapeSequence(key);
          break;
        default:
          if (code >= 32 && code < 127) {
            this.insertChar(key);
          }
      }
      
      this.scheduleRender();
    });
  }

  scheduleRender() {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    this.renderTimeout = setTimeout(() => {
      this._performRender();
    }, 16); // 60fps like original grok-cli
  }

  render() {
    this.scheduleRender();
  }

  _performRender() {
    const output = [];
    
    // Clear and reset
    output.push('\x1B[2J\x1B[H');
    
    // Top border with gradient
    output.push(gradient(['#667eea', '#764ba2'])('═'.repeat(this.terminalWidth)));
    
    // Messages area
    const reservedLines = 10; // Status, input, help
    const messageAreaHeight = Math.max(5, this.terminalHeight - reservedLines);
    
    const visibleMessages = this.messages.slice(-messageAreaHeight);
    const emptyLines = messageAreaHeight - visibleMessages.length;
    
    // Fill empty space at top
    for (let i = 0; i < emptyLines; i++) {
      output.push('');
    }
    
    // Add messages
    visibleMessages.forEach(msg => {
      output.push(this.formatMessage(msg));
    });
    
    // Status line
    output.push(this.renderStatusLine());
    
    // Input area
    output.push(this.renderInputArea());
    
    // Join and render with content diffing
    const rendered = output.join('\n');
    if (rendered !== this.lastRender) {
      process.stdout.write(rendered);
      this.lastRender = rendered;
      
      // Position cursor in input
      this.positionCursor();
    }
  }

  formatMessage(msg) {
    if (!msg) return '';
    
    const maxWidth = this.terminalWidth - 4;
    const lines = msg.split('\n');
    return lines.map(line => {
      if (line.length > maxWidth) {
        // Simple word wrap
        const wrapped = [];
        for (let i = 0; i < line.length; i += maxWidth) {
          wrapped.push(line.substring(i, i + maxWidth));
        }
        return wrapped.join('\n');
      }
      return line;
    }).join('\n');
  }

  renderStatusLine() {
    const parts = [];
    
    // Model with icon and color
    parts.push(this.config.color(`${this.config.icon} ${this.config.model.toUpperCase()}`));
    
    // Auto-edit status
    parts.push(this.autoEdit ? colors.success('▶ Auto-edit ON') : colors.dim('⏸ Auto-edit OFF'));
    
    // Active file
    if (this.activeFile) {
      parts.push(colors.accent(`📄 ${path.basename(this.activeFile)}`));
    }
    
    // Session time
    const sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    const minutes = Math.floor(sessionTime / 60);
    const seconds = sessionTime % 60;
    parts.push(colors.dim(`⏱ ${minutes}:${seconds.toString().padStart(2, '0')}`));
    
    // Message count
    parts.push(colors.dim(`💬 ${this.messages.length}`));
    
    const statusLine = parts.join(colors.dim(' │ '));
    const border = gradient(['#667eea', '#764ba2'])('─'.repeat(this.terminalWidth));
    
    return border + '\n' + statusLine + '\n';
  }

  renderInputArea() {
    const inputContent = this.inputBuffer || colors.dim('Type your message...');
    const inputBox = boxen(inputContent, {
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      borderStyle: 'round',
      borderColor: this.isProcessing ? 'yellow' : 'magenta',
      width: this.terminalWidth - 2
    });
    
    let output = inputBox + '\n';
    
    // Help line
    if (!this.isProcessing) {
      const shortcuts = [
        colors.dim('Tab: Complete'),
        colors.dim('↑↓: History'),
        colors.dim('Shift+Tab: Auto-edit'),
        colors.dim('Ctrl+C: Exit')
      ];
      output += shortcuts.join(colors.dim(' • '));
    } else {
      output += colors.warning('⏳ Processing... Press Esc to cancel');
    }
    
    return output;
  }

  positionCursor() {
    const inputLine = this.terminalHeight - 3;
    const cursorCol = this.cursorPosition + 3;
    process.stdout.write(`\x1B[${inputLine};${cursorCol}H`);
    process.stdout.write('\x1B[?25h');
  }

  addMessage(type, content) {
    let prefix = '';
    let color = colors.text;
    
    switch (type) {
      case 'user':
        prefix = colors.success('▸ You: ');
        break;
      case 'assistant':
        prefix = this.config.color(`${this.config.icon} Orion: `);
        break;
      case 'system':
        prefix = colors.info('⚡ System: ');
        color = colors.dim;
        break;
      case 'tool':
        prefix = colors.tool('⚙ Tool: ');
        color = colors.warning;
        break;
      case 'error':
        prefix = colors.error('✖ Error: ');
        color = colors.error;
        break;
    }
    
    this.messages.push(prefix + color(content));
    
    // Limit history
    if (this.messages.length > 500) {
      this.messages = this.messages.slice(-400);
    }
  }

  insertChar(char) {
    const before = this.inputBuffer.substring(0, this.cursorPosition);
    const after = this.inputBuffer.substring(this.cursorPosition);
    this.inputBuffer = before + char + after;
    this.cursorPosition++;
  }

  handleBackspace() {
    if (this.cursorPosition > 0) {
      const before = this.inputBuffer.substring(0, this.cursorPosition - 1);
      const after = this.inputBuffer.substring(this.cursorPosition);
      this.inputBuffer = before + after;
      this.cursorPosition--;
    }
  }

  handleEscapeSequence(key) {
    if (key.length > 1) {
      const seq = key.substring(1);
      
      if (seq === '[A') { // Up
        this.navigateHistory(-1);
      } else if (seq === '[B') { // Down
        this.navigateHistory(1);
      } else if (seq === '[D') { // Left
        this.cursorPosition = Math.max(0, this.cursorPosition - 1);
      } else if (seq === '[C') { // Right
        this.cursorPosition = Math.min(this.inputBuffer.length, this.cursorPosition + 1);
      }
    }
  }

  navigateHistory(direction) {
    if (direction === -1 && this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.inputBuffer = this.history[this.history.length - 1 - this.historyIndex];
      this.cursorPosition = this.inputBuffer.length;
    } else if (direction === 1 && this.historyIndex > -1) {
      this.historyIndex--;
      if (this.historyIndex === -1) {
        this.inputBuffer = '';
      } else {
        this.inputBuffer = this.history[this.history.length - 1 - this.historyIndex];
      }
      this.cursorPosition = this.inputBuffer.length;
    }
  }

  toggleAutoEdit() {
    this.autoEdit = !this.autoEdit;
    this.addMessage('system', `Auto-edit ${this.autoEdit ? 'enabled ▶' : 'disabled ⏸'}`);
    this.render();
  }

  async handleEnter() {
    const input = this.inputBuffer.trim();
    
    if (!input) return;
    
    // Add to history
    this.history.push(input);
    if (this.history.length > 100) this.history.shift();
    this.historyIndex = -1;
    
    // Clear input
    this.inputBuffer = '';
    this.cursorPosition = 0;
    
    // Add user message
    this.addMessage('user', input);
    
    // Process input
    if (input.startsWith('/')) {
      await this.handleCommand(input);
    } else if (this.isDirectCommand(input)) {
      await this.executeCommand(input);
    } else {
      await this.processWithAI(input);
    }
    
    this.render();
  }

  async handleCommand(cmd) {
    const parts = cmd.slice(1).split(' ');
    const command = parts[0];
    
    switch (command) {
      case 'help':
        this.showHelp();
        break;
      case 'clear':
        this.messages = [];
        break;
      case 'models':
        this.showModels();
        break;
      case 'model':
        if (parts[1]) {
          await this.switchModel(parts[1]);
        } else {
          this.addMessage('error', 'Usage: /model <model-name>');
        }
        break;
      case 'file':
        if (parts[1]) {
          this.activeFile = parts.slice(1).join(' ');
          this.addMessage('system', `Active file set: ${colors.accent(this.activeFile)}`);
        } else {
          this.activeFile = null;
          this.addMessage('system', 'Active file cleared');
        }
        break;
      case 'auto':
        this.toggleAutoEdit();
        break;
      case 'tools':
        this.showTools();
        break;
      case 'about':
        this.showAbout();
        break;
      case 'exit':
      case 'quit':
        this.exit();
        break;
      default:
        this.addMessage('error', `Unknown command: /${command}`);
    }
  }

  showHelp() {
    this.addMessage('system', colors.primary.bold('Available Commands:'));
    this.addMessage('system', '');
    this.addMessage('system', colors.accent('/help') + '     - Show this help message');
    this.addMessage('system', colors.accent('/clear') + '    - Clear chat history');
    this.addMessage('system', colors.accent('/models') + '   - List available AI models');
    this.addMessage('system', colors.accent('/model') + '    - Switch to a different model');
    this.addMessage('system', colors.accent('/file') + '     - Set active file for context');
    this.addMessage('system', colors.accent('/auto') + '     - Toggle auto-edit mode');
    this.addMessage('system', colors.accent('/tools') + '    - Show available tools');
    this.addMessage('system', colors.accent('/about') + '    - About OrionCLI');
    this.addMessage('system', colors.accent('/exit') + '     - Exit the application');
    this.addMessage('system', '');
    this.addMessage('system', colors.primary.bold('Keyboard Shortcuts:'));
    this.addMessage('system', '');
    this.addMessage('system', colors.dim('Tab') + '        - Auto-complete commands');
    this.addMessage('system', colors.dim('↑/↓') + '        - Navigate command history');
    this.addMessage('system', colors.dim('Shift+Tab') + ' - Toggle auto-edit mode');
    this.addMessage('system', colors.dim('Ctrl+C') + '    - Exit application');
  }

  showModels() {
    const models = [
      { name: 'gpt-5', desc: 'Coding & technical tasks', icon: '⚡' },
      { name: 'gpt-5-chat', desc: 'Conversational AI', icon: '💬' },
      { name: 'gpt-5-mini', desc: 'Fast responses', icon: '🚀' },
      { name: 'o3', desc: 'Advanced reasoning', icon: '🧠' },
      { name: 'gpt-4o', desc: 'Multimodal (vision+text)', icon: '👁' },
      { name: 'o4-mini', desc: 'Ultra-fast queries', icon: '⚡' }
    ];
    
    this.addMessage('system', colors.primary.bold('Available Models:'));
    this.addMessage('system', '');
    
    models.forEach(m => {
      const current = m.name === this.config.model;
      const indicator = current ? colors.success('▸') : ' ';
      const name = current ? colors.success.bold(m.name) : colors.primary(m.name);
      this.addMessage('system', `${indicator} ${m.icon} ${name} - ${colors.dim(m.desc)}`);
    });
    
    this.addMessage('system', '');
    this.addMessage('system', colors.dim('Use /model <name> to switch'));
  }

  showTools() {
    this.addMessage('system', colors.primary.bold('Available Tools:'));
    this.addMessage('system', '');
    this.addMessage('system', colors.tool('💻') + ' ' + colors.accent('Code Tools') + ' - Edit, debug, analyze code files');
    this.addMessage('system', colors.tool('📝') + ' ' + colors.accent('Text Editor') + ' - Advanced text editing with diffs');
    this.addMessage('system', colors.tool('🔍') + ' ' + colors.accent('Search') + ' - Intelligent file and content search');
    this.addMessage('system', colors.tool('📋') + ' ' + colors.accent('Todo Manager') + ' - Task tracking and management');
    this.addMessage('system', colors.tool('⚡') + ' ' + colors.accent('Bash Integration') + ' - Execute commands with context');
    this.addMessage('system', colors.tool('🔗') + ' ' + colors.accent('MCP Support') + ' - Model Context Protocol integration');
    this.addMessage('system', colors.tool('🪝') + ' ' + colors.accent('Hooks System') + ' - Custom event handlers');
    this.addMessage('system', '');
    this.addMessage('system', colors.dim('Tools are context-aware and intelligently suggested based on your current task.'));
  }

  showAbout() {
    this.addMessage('system', gradient(['#667eea', '#764ba2'])('╔══════════════════════════════════════╗'));
    this.addMessage('system', gradient(['#667eea', '#764ba2'])('║         ORION CLI v2.0.0             ║'));
    this.addMessage('system', gradient(['#667eea', '#764ba2'])('╚══════════════════════════════════════╝'));
    this.addMessage('system', '');
    this.addMessage('system', colors.primary.bold('Enhanced Azure OpenAI CLI'));
    this.addMessage('system', colors.dim('A better fork of grok-cli with all features preserved'));
    this.addMessage('system', '');
    this.addMessage('system', colors.accent('Features:'));
    this.addMessage('system', '• 6 Azure OpenAI models');
    this.addMessage('system', '• Beautiful, flicker-free UI');
    this.addMessage('system', '• Rich markdown rendering');
    this.addMessage('system', '• Intelligent model routing');
    this.addMessage('system', '• Command suggestions');
    this.addMessage('system', '• Session memory');
    this.addMessage('system', '• Tool integration');
    this.addMessage('system', '');
    this.addMessage('system', colors.info('Created with ❤️ for the AI community'));
  }

  async switchModel(modelName) {
    const validModels = ['gpt-5', 'gpt-5-chat', 'gpt-5-mini', 'o3', 'gpt-4o', 'o4-mini'];
    
    if (!validModels.includes(modelName)) {
      this.addMessage('error', `Invalid model: ${modelName}`);
      return;
    }
    
    process.env.MODEL = modelName;
    this.config = this.loadConfig();
    this.client = this.createClient();
    
    this.addMessage('system', `${colors.success('✓')} Switched to ${this.config.color(this.config.icon + ' ' + modelName)}`);
  }

  // Smart model selection
  selectModelForTask(input) {
    const lowerInput = input.toLowerCase();
    
    // Code tasks -> gpt-5
    if (/\b(code|function|class|debug|typescript|javascript|python|error|bug|syntax|implement|fix)\b/.test(lowerInput)) {
      return 'gpt-5';
    }
    
    // Complex reasoning -> o3
    if (/\b(analyze|think|reason|logic|complex|strategy|plan|architecture|design|solve)\b/.test(lowerInput)) {
      return 'o3';
    }
    
    // Quick questions -> o4-mini
    if (input.length < 50 || /\b(what|how|when|where|quick|simple|short)\b/.test(lowerInput)) {
      return 'o4-mini';
    }
    
    // Visual content -> gpt-4o
    if (/\b(image|visual|picture|diagram|chart|see|view|look)\b/.test(lowerInput)) {
      return 'gpt-4o';
    }
    
    return this.config.model;
  }

  isDirectCommand(input) {
    const commands = ['ls', 'pwd', 'cd', 'cat', 'echo', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'git', 'npm'];
    return commands.includes(input.split(' ')[0]);
  }

  async executeCommand(cmd) {
    this.addMessage('tool', `Executing: ${cmd}`);
    
    try {
      const { stdout, stderr } = await execAsync(cmd);
      if (stdout) {
        this.addMessage('system', stdout.trim());
      }
      if (stderr) {
        this.addMessage('error', stderr.trim());
      }
    } catch (error) {
      this.addMessage('error', error.message);
    }
  }

  async processWithAI(input) {
    this.isProcessing = true;
    
    // Smart model selection
    const optimalModel = this.selectModelForTask(input);
    let usingClient = this.client;
    let usingConfig = this.config;
    
    if (optimalModel !== this.config.model) {
      this.addMessage('system', `${colors.info('🧠 Smart routing:')} ${colors.dim('task analysis')} → ${this.config.color(optimalModel)}`);
      
      process.env.MODEL = optimalModel;
      usingConfig = this.loadConfig();
      usingClient = this.createClient();
    }
    
    this.addMessage('system', colors.info('💭 Generating response...'));
    this.render();
    
    try {
      const messages = [
        {
          role: 'system',
          content: `You are OrionCLI, an advanced AI assistant. Be helpful and concise. Active file: ${this.activeFile || 'none'}.`
        },
        { role: 'user', content: input }
      ];

      // Build completion params based on model capabilities
      const completionParams = {
        model: usingConfig.deployment,
        messages
      };
      
      // Add temperature only if model supports it
      if (usingConfig.supportsTemperature) {
        completionParams.temperature = 0.7;
      }

      const completion = await usingClient.chat.completions.create(completionParams);
      const response = completion.choices[0].message.content;
      
      // Add response line by line for better display
      const lines = response.split('\n');
      lines.forEach((line, index) => {
        this.addMessage('assistant', line || (index < lines.length - 1 ? ' ' : ''));
      });
      
    } catch (error) {
      this.addMessage('error', `${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  exit() {
    console.clear();
    console.log(gradient(['#667eea', '#764ba2', '#f093fb'])(ORION_ASCII));
    console.log(colors.primary.bold('\n        Thank you for using OrionCLI! 👋\n'));
    console.log(colors.dim('        May your code be bug-free and your'));
    console.log(colors.dim('        deployments always successful! 🚀\n'));
    process.exit(0);
  }
}

// Check environment
if (!process.env.ORION_DEFAULT_KEY && !process.env.ORION_O3_KEY) {
  console.error(colors.error(`
❌ No API keys found!

Please create a .env file with:
  ORION_DEFAULT_KEY=your_azure_key_here
  ORION_O3_KEY=your_o3_key_here
`));
  process.exit(1);
}

// Start CLI
const cli = new OrionCLI();
cli.start().catch(error => {
  console.error(colors.error('Failed to start:'), error);
  process.exit(1);
});