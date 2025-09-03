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
const OrionToolRegistry = require('./src/tools/orion-tool-registry');
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
    this.conversationHistory = [];
    this.config = this.loadConfig();
    this.client = this.createClient();
    this.toolRegistry = new OrionToolRegistry();
    this.activeFile = null;
    this.autoEdit = false;
    this.isProcessing = false;
    this.terminalWidth = process.stdout.columns || 80;
    this.terminalHeight = process.stdout.rows || 30;
    this.lastRender = '';
    this.renderTimeout = null;
    this.sessionStartTime = Date.now();
    this.lastToggleTime = 0;
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
      
      // For newlines: Check for Ctrl+Enter (should add newline, not submit)
      // Ctrl+Enter typically sends \n (LF, code 10) in most terminals
      if (key === '\n' || key.charCodeAt(0) === 10) {
        this.insertChar('\n');
        this.scheduleRender();
        return;
      }
      
      // Check for Shift+Enter (various possible sequences)
      if (key.includes('\x1B') && (key.includes('\r') || key.includes('\n'))) {
        this.insertChar('\n');
        this.scheduleRender();
        return;
      }
      
      const code = key.charCodeAt(0);
      
      switch (code) {
        case 3: // Ctrl+C
          this.exit();
          break;
        case 13: // Carriage Return (Enter) - submit the prompt
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
    
    // Clean top border
    output.push(colors.dim('─'.repeat(this.terminalWidth)));
    
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
    
    // Ensure msg is a string
    msg = String(msg);
    
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
    
    // Session time
    const sessionTime = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    const minutes = Math.floor(sessionTime / 60);
    const seconds = sessionTime % 60;
    parts.push(colors.dim(`⏱ ${minutes}:${seconds.toString().padStart(2, '0')}`));
    
    // Message count (reduced importance)
    parts.push(colors.dim(`💬 ${this.messages.length}`));
    
    const statusLine = parts.join(colors.dim(' │ '));
    
    return statusLine + '\n';
  }

  renderInputArea() {
    // Grok-cli approach: Visual cursor within content
    const inputValue = this.inputBuffer || '';
    
    // Split input into lines for multiline support  
    const lines = inputValue.split('\n');
    const displayLines = lines.map((line, i) => {
      const prefix = i === 0 ? '❯ ' : '│ ';
      return prefix + line;
    });
    
    // Add visual cursor (grok-cli style)
    if (!this.isProcessing) {
      const textBeforeCursor = inputValue.substring(0, this.cursorPosition);
      const cursorLineIndex = textBeforeCursor.split('\n').length - 1;
      const cursorColumn = textBeforeCursor.split('\n')[cursorLineIndex].length;
      
      if (displayLines[cursorLineIndex]) {
        const line = displayLines[cursorLineIndex];
        const insertPos = cursorColumn + 2; // Account for prefix
        displayLines[cursorLineIndex] = 
          line.substring(0, insertPos) + 
          chalk.inverse(' ') + 
          line.substring(insertPos);
      }
    }
    
    // Create content and pad to full width (restore the smart shit!)
    let content = displayLines.join('\n') || colors.dim('Ask me anything...');
    
    // Ensure content is padded to full width - CRITICAL for full terminal width
    const boxWidth = this.terminalWidth - 4; // Account for border and padding
    const contentLines = content.split('\n');
    const paddedLines = contentLines.map(line => {
      // Strip ANSI colors to get real length, then pad
      const cleanLine = line.replace(/\x1B\[[0-9;]*m/g, '');
      const padding = Math.max(0, boxWidth - cleanLine.length);
      return line + ' '.repeat(padding);
    });
    content = paddedLines.join('\n');
    
    const inputBox = boxen(content, {
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      borderStyle: 'round',
      borderColor: this.isProcessing ? 'yellow' : 'magenta',
      width: this.terminalWidth - 2, // Full terminal width - margins
      align: 'left'
    });
    
    let output = inputBox + '\n';
    
    // Help line
    if (!this.isProcessing) {
      const shortcuts = [
        colors.dim('Tab: Complete'),
        colors.dim('↑↓: History'),
        colors.dim('Ctrl+Enter: New line'),
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
    // Hide terminal cursor since we use visual cursor in content
    process.stdout.write('\x1B[?25l');
  }

  addMessage(type, content) {
    // Handle null/undefined content
    if (content === null || content === undefined) {
      content = '';
    }
    
    // Convert to string if needed
    content = String(content);
    
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
    // REMOVED: Toggle messages to stop spam completely
    // The status is already visible in the status bar, no need for chat messages
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
        this.conversationHistory = [];
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
    
    // Smart task classification and tool detection
    const taskInfo = this.analyzeTask(input);
    const optimalModel = this.selectModelForTask(input);
    let usingClient = this.client;
    let usingConfig = this.config;
    
    // Only show routing if model changes
    if (optimalModel !== this.config.model) {
      this.addMessage('system', `${colors.info('🎯')} ${colors.dim(taskInfo.type)} → ${this.config.color(optimalModel)}`);
      this.render();
      
      process.env.MODEL = optimalModel;
      usingConfig = this.loadConfig();
      usingClient = this.createClient();
    }
    
    // Only show tools if needed and high priority
    if (taskInfo.needsTools && taskInfo.priority === 'high') {
      this.addMessage('system', colors.accent(`🔧 ${taskInfo.tools.join(', ')}`));
      this.render();
    }
    
    // Show thinking indicator only
    this.addMessage('system', colors.info('💭 Thinking...'));
    this.render();
    
    try {
      // Build context info
      const contextInfo = this.buildContext(input, taskInfo);
      
      // Add user message to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: input
      });
      
      // Enhanced system prompt with tool awareness  
      const systemPrompt = this.buildSystemPrompt(taskInfo, contextInfo);
      
      // Build messages array starting with system prompt
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        // Add conversation history (keep last 40 messages to manage context)
        ...this.conversationHistory.slice(-40)
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
      
      // Add tools if task requires them
      if (taskInfo.needsTools) {
        completionParams.tools = this.toolRegistry.getToolDefinitions(taskInfo.tools);
      }

      const completion = await usingClient.chat.completions.create(completionParams);
      const response = completion.choices[0].message.content;
      
      // Handle tool calls if present
      if (completion.choices[0].message.tool_calls) {
        await this.handleToolCalls(completion.choices[0].message.tool_calls);
      }
      
      // Only process response if there is content (AI might only return tool calls)
      if (response) {
        // Add response line by line for better display
        const lines = response.split('\n');
        lines.forEach((line, index) => {
          this.addMessage('assistant', line || (index < lines.length - 1 ? ' ' : ''));
        });
        
        // Add assistant response to conversation history
        this.conversationHistory.push({
          role: 'assistant',
          content: response
        });
      }
    } catch (error) {
      this.addMessage('error', `${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  // Smart Assistant Helper Functions
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  analyzeTask(input) {
    const lowerInput = input.toLowerCase();
    
    // Time/date requests
    if (/\b(time|date|now|current|clock|timezone|est|pst|utc)\b/.test(lowerInput)) {
      return {
        type: 'time query',
        needsTools: true,
        tools: ['bash', 'web-search'],
        priority: 'high'
      };
    }
    
    // File operations - enhanced detection
    if (/\b(read|write|edit|file|create|delete|ls|pwd|cat|save|md|\.md|markdown|document|plan)\b/.test(lowerInput) ||
        /\b(what is|explain|show|about|describe|tell me about|contents? of)\b.*\b(file|\.md|\.txt|\.js|\.json|readme)\b/i.test(lowerInput) ||
        /\.(md|txt|js|json|yml|yaml|xml|html|css|py|ts|tsx|jsx)(\s|$)/i.test(lowerInput)) {
      return {
        type: 'file operation',
        needsTools: true,
        tools: ['file-tools', 'bash'],
        priority: 'high'
      };
    }
    
    // Code tasks
    if (/\b(code|function|class|debug|implement|fix|syntax|error|bug|test|format|lint|analyze)\b/.test(lowerInput)) {
      return {
        type: 'coding task',
        needsTools: true,
        tools: ['code-tools', 'file-tools', 'git-tools', 'bash'],
        priority: 'high'
      };
    }
    
    // Git operations
    if (/\b(git|commit|push|pull|merge|branch|status|diff|log)\b/.test(lowerInput)) {
      return {
        type: 'git operation',
        needsTools: true,
        tools: ['git-tools', 'bash'],
        priority: 'high'
      };
    }
    
    // System operations
    if (/\b(system|process|disk|memory|cpu|performance|monitor|network|ssh|server|remote)\b/.test(lowerInput)) {
      return {
        type: 'system query',
        needsTools: true,
        tools: ['system-tools', 'ssh-tools', 'bash'],
        priority: 'medium'
      };
    }
    
    // Conversion and encoding
    if (/\b(convert|encode|decode|base64|hash|md5|sha|transform|format|json|url)\b/.test(lowerInput)) {
      return {
        type: 'conversion task',
        needsTools: true,
        tools: ['conversion-tools', 'file-tools'],
        priority: 'medium'
      };
    }
    
    // Docker operations
    if (/\b(docker|container|compose|dockerfile|image|pod)\b/.test(lowerInput)) {
      return {
        type: 'docker operation',
        needsTools: true,
        tools: ['docker-tools', 'system-tools', 'bash'],
        priority: 'high'
      };
    }
    
    // Web searches - Enhanced for programming and security
    if (/\b(search|find|lookup|what is|who is|weather|news|documentation|docs|fix|bug|error|solution|help)\b/.test(lowerInput)) {
      return {
        type: 'information query', 
        needsTools: true,
        tools: ['web-search-tools', 'bash'],
        priority: 'medium'
      };
    }
    
    // General conversation
    return {
      type: 'conversation',
      needsTools: false,
      tools: [],
      priority: 'low'
    };
  }
  
  buildContext(input, taskInfo) {
    const context = {
      enhanced: false,
      description: '',
      workingDir: process.cwd(),
      activeFile: this.activeFile,
      sessionTime: Math.floor((Date.now() - this.sessionStartTime) / 1000)
    };
    
    // Add file context
    if (this.activeFile) {
      context.enhanced = true;
      context.description = `Active file: ${path.basename(this.activeFile)}`;
    }
    
    // Add directory context for file operations
    if (taskInfo.type === 'file operation') {
      context.enhanced = true;
      context.description += (context.description ? ', ' : '') + `Working dir: ${path.basename(process.cwd())}`;
    }
    
    // Add session context for complex tasks
    if (taskInfo.priority === 'high') {
      context.enhanced = true;
      const minutes = Math.floor(context.sessionTime / 60);
      context.description += (context.description ? ', ' : '') + `Session: ${minutes}m`;
    }
    
    return context;
  }
  
  buildSystemPrompt(taskInfo, contextInfo) {
    let prompt = `You are OrionCLI, an advanced AI assistant with access to powerful tools and real-time capabilities.
    
Current Context:
- Working Directory: ${contextInfo.workingDir}
- Active File: ${contextInfo.activeFile || 'none'}
- Task Type: ${taskInfo.type}
- Session Time: ${Math.floor(contextInfo.sessionTime / 60)}m

Available Tools: ${taskInfo.needsTools ? taskInfo.tools.join(', ') : 'none required'}`;

    // Task-specific instructions
    if (taskInfo.type === 'time query') {
      prompt += `\n\nFor time/date queries, you MUST use the bash tool to get real-time information:
- Use 'date' command for current time
- Use 'TZ="America/New_York" date' for EST
- Use 'TZ="America/Los_Angeles" date' for PST
- Always provide actual current time, not placeholder responses`;
    }
    
    if (taskInfo.type === 'information query') {
      prompt += `\n\nFor information queries, use web search tools to get current, accurate information.`;
    }
    
    if (taskInfo.type === 'file operation') {
      prompt += `\n\nFor file operations:
- When asked "what is X file about" or "explain X file" → Use read_file to READ the content first, then explain it
- When asked to check if file exists → Use file_exists 
- When asked to modify → Use edit_file or write_file
- When asked to delete → Use delete_file with confirmation
- ALWAYS read files when users want to know ABOUT them, not just if they exist`;
    }
    
    // Add comprehensive tool usage instructions
    prompt += `\n\n📚 TOOL USAGE GUIDE:

FILE TOOLS:
• read_file → Use when user asks "what is X about", "explain X", "show me X"
• write_file → Create new files with content
• edit_file → Modify existing file content by replacing text
• delete_file → Remove files (always confirm first unless force:true)
• update_file → Append/prepend to existing files
• file_exists → ONLY when asked if file exists, NOT for reading content
• list_files → Show directory contents

GIT TOOLS:
• git_status → Check repo status
• git_diff → Show changes
• git_commit → Commit with message
• git_push/pull → Sync with remote
• git_branch → Manage branches
• git_log → Show history
• git_stash → Save/restore work

SYSTEM TOOLS:
• system_info → OS and hardware details
• process_list → Running processes
• memory_usage → RAM statistics
• disk_usage → Storage info
• network_info → Network configuration
• environment_vars → ENV variables

DOCKER TOOLS:
• docker_ps → List containers
• docker_images → List images  
• docker_logs → Container logs
• docker_exec → Run commands in containers
• docker_build/run/stop → Container management

SSH TOOLS:
• ssh_connect → Remote connection
• ssh_execute → Run remote commands
• scp_upload/download → Transfer files

DATABASE TOOLS:
• db_query → Execute SQL
• db_schema → Show structure
• db_backup/restore → Data management

CONVERSION TOOLS:
• base64_encode/decode → Base64 conversion
• hash_text → Generate hashes
• format_json/xml → Format data
• text_transform → Case/format changes

WEB SEARCH:
• web_search → Current information
• search_programming → Code examples
• search_security → Security info
• search_documentation → Technical docs

IMPORTANT: Always use the RIGHT tool for the task. Read files when asked ABOUT them, not just check existence!`;
    
    prompt += `\n\nBe helpful, precise, and use tools when available. Provide real results, not generic responses.`;
    
    return prompt;
  }
  
  // OLD METHOD REMOVED - Now using modular OrionToolRegistry
  
  async handleToolCalls(toolCalls) {
    const tools = [];
    
    if (toolNames.includes('bash')) {
      tools.push({
        type: 'function',
        function: {
          name: 'execute_bash',
          description: 'Execute bash commands and return output',
          parameters: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The bash command to execute'
              }
            },
            required: ['command']
          }
        }
      });
    }
    
    if (toolNames.includes('web-search')) {
      tools.push({
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web for current information',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query'
              }
            },
            required: ['query']
          }
        }
      });
    }
    
    if (toolNames.includes('file-tools')) {
      // File operations
      tools.push({
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
      });
      
      tools.push({
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
      });
      
      tools.push({
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
      });
      
      tools.push({
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
      });
    }
    
    if (toolNames.includes('code-tools')) {
      tools.push({
        type: 'function',
        function: {
          name: 'analyze_code',
          description: 'Analyze code for issues, patterns, or improvements',
          parameters: {
            type: 'object',
            properties: {
              filename: { type: 'string', description: 'Code file to analyze' },
              analysis_type: { type: 'string', description: 'Type: syntax, performance, style, security' }
            },
            required: ['filename']
          }
        }
      });
      
      tools.push({
        type: 'function',
        function: {
          name: 'run_tests',
          description: 'Run tests in the project',
          parameters: {
            type: 'object',
            properties: {
              test_file: { type: 'string', description: 'Specific test file or pattern' },
              framework: { type: 'string', description: 'Test framework: jest, mocha, pytest, etc.' }
            },
            required: []
          }
        }
      });
      
      tools.push({
        type: 'function',
        function: {
          name: 'format_code',
          description: 'Format code using standard formatters',
          parameters: {
            type: 'object',
            properties: {
              filename: { type: 'string', description: 'File to format' },
              formatter: { type: 'string', description: 'Formatter: prettier, black, gofmt, etc.' }
            },
            required: ['filename']
          }
        }
      });
    }
    
    if (toolNames.includes('git-tools')) {
      tools.push({
        type: 'function',
        function: {
          name: 'git_status',
          description: 'Show git repository status',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      });
      
      tools.push({
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
      });
      
      tools.push({
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
      });
      
      tools.push({
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
      });
      
      tools.push({
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
      });
      
      tools.push({
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
      });
      
      tools.push({
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
      });
      
      tools.push({
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
      });
    }
    
    if (toolNames.includes('system-tools')) {
      tools.push({
        type: 'function',
        function: {
          name: 'system_info',
          description: 'Get system information',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      });
      
      tools.push({
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
      });
      
      tools.push({
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
      });
      
      tools.push({
        type: 'function',
        function: {
          name: 'network_info',
          description: 'Get network configuration and status',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      });
      
      tools.push({
        type: 'function',
        function: {
          name: 'memory_info',
          description: 'Get memory usage information',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      });
      
      tools.push({
        type: 'function',
        function: {
          name: 'cpu_info',
          description: 'Get CPU information and usage',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      });
    }
    
    if (toolNames.includes('ssh-tools')) {
      tools.push({
        type: 'function',
        function: {
          name: 'ssh_connect',
          description: 'Connect to remote server via SSH',
          parameters: {
            type: 'object',
            properties: {
              host: { type: 'string', description: 'Remote host address' },
              user: { type: 'string', description: 'Username' },
              command: { type: 'string', description: 'Command to execute remotely' }
            },
            required: ['host', 'user', 'command']
          }
        }
      });
      
      tools.push({
        type: 'function',
        function: {
          name: 'scp_transfer',
          description: 'Transfer files via SCP',
          parameters: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Source file path' },
              destination: { type: 'string', description: 'Destination path (user@host:/path)' },
              direction: { type: 'string', description: 'upload or download' }
            },
            required: ['source', 'destination', 'direction']
          }
        }
      });
      
      tools.push({
        type: 'function',
        function: {
          name: 'ssh_keygen',
          description: 'Generate SSH key pair',
          parameters: {
            type: 'object',
            properties: {
              filename: { type: 'string', description: 'Key filename (default: id_rsa)' },
              type: { type: 'string', description: 'Key type: rsa, ed25519, etc.' }
            },
            required: []
          }
        }
      });
    }
    
    if (toolNames.includes('conversion-tools')) {
      tools.push({
        type: 'function',
        function: {
          name: 'convert_image',
          description: 'Convert image between formats',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Input image file' },
              output: { type: 'string', description: 'Output image file' },
              format: { type: 'string', description: 'Target format: jpg, png, webp, etc.' }
            },
            required: ['input', 'output']
          }
        }
      });
      
      tools.push({
        type: 'function',
        function: {
          name: 'convert_text',
          description: 'Convert text between formats and encodings',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Text to convert' },
              from_format: { type: 'string', description: 'Source format' },
              to_format: { type: 'string', description: 'Target format' }
            },
            required: ['text', 'to_format']
          }
        }
      });
      
      tools.push({
        type: 'function',
        function: {
          name: 'base64_encode',
          description: 'Encode text or file to Base64',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Text or file path to encode' },
              is_file: { type: 'boolean', description: 'Whether input is a file path' }
            },
            required: ['input']
          }
        }
      });
      
      tools.push({
        type: 'function',
        function: {
          name: 'base64_decode',
          description: 'Decode Base64 to text or file',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Base64 string to decode' },
              output_file: { type: 'string', description: 'Output file path (optional)' }
            },
            required: ['input']
          }
        }
      });
      
      tools.push({
        type: 'function',
        function: {
          name: 'hash_generate',
          description: 'Generate hash (MD5, SHA1, SHA256, etc.)',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Text or file to hash' },
              algorithm: { type: 'string', description: 'Hash algorithm: md5, sha1, sha256, sha512' },
              is_file: { type: 'boolean', description: 'Whether input is a file path' }
            },
            required: ['input']
          }
        }
      });
    }
    
    return tools;
  }
  
  async handleToolCalls(toolCalls) {
    for (const toolCall of toolCalls) {
      // Show minimal tool execution indicator
      this.addMessage('system', colors.tool(`🔧 ${toolCall.function.name}`));
      this.render();
      
      try {
        const args = JSON.parse(toolCall.function.arguments);
        let result = '';
        
        // Handle built-in tools
        if (toolCall.function.name === 'execute_bash') {
          result = await this.executeBashCommand(args.command);
        } else if (toolCall.function.name === 'web_search') {
          result = `Web search for "${args.query}" would be performed here`;
        } else {
          // Use modular tool registry for all other tools
          result = await this.toolRegistry.executeTool(toolCall.function.name, args);
        }
        
        // Show clean result (handle null/undefined results and objects)
        if (result !== null && result !== undefined) {
          let displayMessage = '';
          
          // Handle object results from tools
          if (typeof result === 'object') {
            if (result.output) {
              displayMessage = result.output;
            } else if (result.error) {
              this.addMessage('error', result.error);
              return;
            } else {
              // Fallback for other objects
              displayMessage = JSON.stringify(result, null, 2);
            }
          } else {
            // String or primitive result
            displayMessage = String(result);
          }
          
          this.addMessage('tool', colors.success(displayMessage));
        } else {
          this.addMessage('tool', colors.warning('Tool executed but returned no output'));
        }
        this.render();
        
      } catch (error) {
        this.addMessage('error', `${error.message}`);
        this.render();
      }
    }
  }
  
  async executeBashCommand(command) {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve(stdout.trim() || 'Command executed successfully');
        }
      });
    });
  }

  async writeFile(filename, content) {
    try {
      await fs.writeFile(filename, content, 'utf8');
      return `✅ File '${filename}' created successfully (${content.length} characters)`;
    } catch (error) {
      throw new Error(`Failed to write file '${filename}': ${error.message}`);
    }
  }

  async readFile(filename) {
    try {
      const content = await fs.readFile(filename, 'utf8');
      return `📄 File '${filename}' (${content.length} characters):\n\n${content}`;
    } catch (error) {
      throw new Error(`Failed to read file '${filename}': ${error.message}`);
    }
  }

  async editFile(filename, oldText, newText) {
    try {
      const content = await fs.readFile(filename, 'utf8');
      const newContent = content.replace(oldText, newText);
      await fs.writeFile(filename, newContent, 'utf8');
      return `✏️ File '${filename}' edited successfully (replaced "${oldText.slice(0,50)}...")`;
    } catch (error) {
      throw new Error(`Failed to edit file '${filename}': ${error.message}`);
    }
  }

  async listFiles(directory) {
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

  async analyzeCode(filename, analysisType = 'general') {
    try {
      const content = await fs.readFile(filename, 'utf8');
      const lines = content.split('\n').length;
      const chars = content.length;
      const ext = path.extname(filename);
      
      return `🔍 Code Analysis for '${filename}' (${analysisType}):\n\n` +
             `Lines: ${lines}, Characters: ${chars}, Type: ${ext}\n` +
             `Analysis would check for: syntax, performance, style, security issues`;
    } catch (error) {
      throw new Error(`Failed to analyze '${filename}': ${error.message}`);
    }
  }

  async runTests(testFile, framework) {
    const command = framework === 'jest' ? 'npm test' : 
                   framework === 'pytest' ? 'pytest' :
                   testFile ? `npm test ${testFile}` : 'npm test';
    return await this.executeBashCommand(command);
  }

  async formatCode(filename, formatter) {
    const command = formatter === 'prettier' ? `prettier --write ${filename}` :
                   formatter === 'black' ? `black ${filename}` :
                   `prettier --write ${filename}`;
    return await this.executeBashCommand(command);
  }

  async gitCommit(message, files) {
    try {
      if (files && files.length > 0) {
        await this.executeBashCommand(`git add ${files.join(' ')}`);
      } else {
        await this.executeBashCommand('git add .');
      }
      return await this.executeBashCommand(`git commit -m "${message}"`);
    } catch (error) {
      throw new Error(`Git commit failed: ${error.message}`);
    }
  }

  async getSystemInfo() {
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

  async getProcessList(filter) {
    const command = process.platform === 'win32' ? 'tasklist' :
                   filter ? `ps aux | grep ${filter}` : 'ps aux';
    return await this.executeBashCommand(command);
  }

  async getDiskUsage(path) {
    const command = process.platform === 'win32' ? `dir "${path}"` : `du -sh "${path}"`;
    return await this.executeBashCommand(command);
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