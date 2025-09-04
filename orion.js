#!/usr/bin/env node

/**
 * OrionCLI - Enhanced Azure OpenAI CLI
 * Based on original grok-cli architecture with all smart features
 */

// Load environment variables from .env file
require('dotenv').config();

const readline = require('readline');
const chalk = require('chalk');
const boxen = require('boxen');
const gradient = require('gradient-string');
const figlet = require('figlet');
const OpenAI = require('openai').default;
const fs = require('fs').promises;
const path = require('path');
const marked = require('marked');
const TerminalRenderer = require('marked-terminal').default || require('marked-terminal');
const OrionToolRegistry = require('./src/tools/orion-tool-registry');
const JsonToolParser = require('./src/tools/json-tool-parser');
const FileTools = require('./src/tools/file-tools');
const PermissionManager = require('./src/permissions/permission-manager');
const PermissionPrompt = require('./src/permissions/permission-prompt');
const TaskUnderstanding = require('./src/intelligence/task-understanding');
// Enhanced orchestration removed - causes conflicts with SimpleOrchestrator
const ProjectAwareness = require('./src/intelligence/project-awareness');
const ContextManager = require('./src/intelligence/context-manager');
const SimpleOrchestrator = require('./src/intelligence/simple-orchestrator');
const ToolForgeIntegration = require('./src/experimental/tool-forge-integration');
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
    this.multiLineMode = false;
    this.multiLineBuffer = [];
    this.config = this.loadConfig();
    this.client = this.createClient();
    this.toolRegistry = new OrionToolRegistry();
    
    // Setup markdown renderer
    marked.setOptions({
      renderer: new TerminalRenderer({
        showSectionPrefix: false,
        width: 80,
        reflowText: true,
        tab: 2,
        code: chalk.cyan,
        blockquote: chalk.gray.italic,
        html: chalk.gray,
        heading: chalk.green.bold,
        firstHeading: chalk.magenta.bold,
        hr: chalk.gray,
        listitem: chalk.gray,
        list: (body) => body,
        paragraph: chalk.white,
        strong: chalk.bold,
        em: chalk.italic,
        codespan: chalk.cyan,
        del: chalk.dim.gray.strikethrough,
        link: chalk.blue.underline,
        href: chalk.blue.underline
      })
    });
    
    // Rendering control
    this.renderMode = 'smart'; // 'smart' or 'full'
    this.lastRenderTime = 0;
    this.renderThrottle = 50; // Minimum ms between renders
    this.isScrolling = false;
    this.scrollTimeout = null;
    
    // Intelligence systems
    this.taskUnderstanding = new TaskUnderstanding();
    // EnhancedOrchestration removed - use only SimpleOrchestrator for mega tasks
    this.projectAwareness = new ProjectAwareness();
    this.contextManager = new ContextManager();
    this.simpleOrchestrator = new SimpleOrchestrator();
    
    // Experimental ToolForge integration
    this.toolForge = new ToolForgeIntegration();
    this.toolForgeEnabled = false; // Disabled by default
    
    // Permission system
    this.permissionManager = new PermissionManager();
    this.permissionPrompt = new PermissionPrompt();
    
    // Spinner animation
    this.spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.spinnerIndex = 0;
    this.spinnerInterval = null;
    
    this.activeFile = null;
    this.autoEdit = true;  // Always enabled - otherwise AI does nothing
    this.isProcessing = false;
    this.showUserMessages = false; // Hide user messages by default to reduce spam
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
    
    // Initial render with clear
    this.renderMode = 'initial';
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
    // Don't render if scrolling
    if (this.isScrolling) {
      return;
    }
    
    // Throttle rendering
    const now = Date.now();
    if (now - this.lastRenderTime < this.renderThrottle) {
      if (!this.renderTimeout) {
        this.renderTimeout = setTimeout(() => {
          this.renderTimeout = null;
          this._performRender();
        }, this.renderThrottle);
      }
      return;
    }
    
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    this.renderTimeout = setTimeout(() => {
      this._performRender();
    }, 16); // 60fps like original grok-cli
  }

  render(force = false) {
    if (force) {
      this.renderMode = 'full';
    }
    this.scheduleRender();
  }

  /**
   * Start spinner animation
   */
  startSpinner() {
    if (!this.spinnerInterval) {
      // Hide cursor during processing
      process.stdout.write('\x1B[?25l');
      this.spinnerInterval = setInterval(() => {
        this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
        if (this.isProcessing) {
          this.updateStatusLine();
        }
      }, 80);
    }
  }
  
  /**
   * Stop spinner animation
   */
  stopSpinner() {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
      // Clear the spinner line
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
      // Just update the input area, not the whole screen
      this.render();
      // Show cursor again
      process.stdout.write('\x1B[?25h');
    }
  }
  
  /**
   * Update status line with spinner
   */
  updateStatusLine() {
    if (this.isProcessing && this.spinnerInterval) {
      const spinner = this.spinnerFrames[this.spinnerIndex];
      // Update the processing indicator in the status
      this.processingIndicator = `${spinner} Processing...`;
      this.render();
    }
  }
  
  _performRender() {
    this.lastRenderTime = Date.now();
    const output = [];
    
    // Only clear screen on initial render or when explicitly requested
    if (this.renderMode === 'initial' || this.renderMode === 'full') {
      output.push('\x1B[2J\x1B[H'); // Clear screen and home cursor
      this.renderMode = 'update'; // Switch to update mode
    } else {
      // For updates, just move cursor home
      output.push('\x1B[H');
      // Clear to end of screen to remove old content
      output.push('\x1B[J');
    }
    
    // Clean top border
    output.push(colors.dim('─'.repeat(this.terminalWidth)));
    
    // Messages area
    const reservedLines = 10; // Status, input, help
    const messageAreaHeight = Math.max(5, this.terminalHeight - reservedLines);
    
    // Filter out user messages to reduce spam - user input is already shown in the input box
    const filteredMessages = this.showUserMessages ? this.messages : this.messages.filter(msg => {
      // Keep all non-user messages
      return !msg.startsWith(colors.success('▸ You: '));
    });
    
    const visibleMessages = filteredMessages.slice(-messageAreaHeight);
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
      const spinner = this.spinnerFrames[this.spinnerIndex] || '⏳';
      output += colors.warning(`${spinner} Processing... Press Esc to cancel`);
    }
    
    return output;
  }

  positionCursor() {
    // Only hide cursor during processing, show it otherwise
    if (this.isProcessing) {
      process.stdout.write('\x1B[?25l');
    } else {
      process.stdout.write('\x1B[?25h');
    }
  }

  addMessage(type, content) {
    // Handle null/undefined content
    if (content === null || content === undefined) {
      content = '';
    }
    
    // Convert to string if needed
    content = String(content);
    
    // Skip empty messages for assistant
    if (type === 'assistant' && !content.trim()) {
      return;
    }
    
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
    
    // Render markdown for assistant messages
    let formattedContent = content;
    if (type === 'assistant' && content.includes('**') || content.includes('##') || content.includes('```')) {
      try {
        // Render markdown (marked-terminal handles the formatting)
        formattedContent = marked(content).trim();
      } catch (e) {
        // Fallback to plain text if markdown fails
        formattedContent = content;
      }
    } else {
      formattedContent = color(content);
    }
    
    const formattedMessage = prefix + formattedContent;
    this.messages.push(formattedMessage);
    
    // Don't try to insert above - just add to message list
    // The render system will handle display
    
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
    
    if (!input) {
      // If buffer is empty but we have a multi-line buffer, process it
      if (this.multiLineBuffer && this.multiLineBuffer.length > 0) {
        const fullInput = this.multiLineBuffer.join('\n');
        this.multiLineBuffer = [];
        this.multiLineMode = false;
        
        // Add to history
        this.history.push(fullInput);
        if (this.history.length > 100) this.history.shift();
        this.historyIndex = -1;
        
        // Add user message
        this.addMessage('user', fullInput);
        
        // Process the complete multi-line input
        await this.processWithAI(fullInput);
        this.render();
      }
      return;
    }
    
    // Check if this looks like the start or continuation of a numbered list
    const isNumberedLine = /^\d+\.\s+/.test(input);
    
    // Check if it's a single-line mega prompt (all operations on one line)
    const isSingleLineMegaPrompt = input.includes('1.') && input.includes('2.') && 
                                   input.includes('3.') && !input.includes('\n');
    
    // Don't enter multi-line mode for single-line mega prompts
    if (isSingleLineMegaPrompt) {
      // Process immediately
    } else {
      const startsWithExecute = /execute.*following.*\d+.*operations?/i.test(input) && 
                                !isSingleLineMegaPrompt;
      const looksLikeListHeader = /\d+\s+(operations?|steps?|tasks?|items?|numbered)/i.test(input) &&
                                  !isSingleLineMegaPrompt;
      
      // Start multi-line mode if we detect a numbered list pattern
      if (isNumberedLine || startsWithExecute || looksLikeListHeader || this.multiLineMode) {
      if (!this.multiLineMode) {
        this.multiLineMode = true;
        this.multiLineBuffer = [];
        this.expectedLines = 0;
        if (process.env.DEBUG_INPUT) {
          console.log(colors.dim(`[DEBUG] Multi-line mode started`));
        }
        
        // Try to detect expected number of lines
        const countMatch = input.match(/(\d+)\s+(operations?|steps?|tasks?|items?|numbered)/i) ||
                          input.match(/following\s+(\d+)/i);
        if (countMatch) {
          this.expectedLines = parseInt(countMatch[1]);
          if (process.env.DEBUG_INPUT) {
            console.log(colors.dim(`[DEBUG] Expecting ${this.expectedLines} lines`));
          }
        } else if (process.env.DEBUG_INPUT) {
          console.log(colors.dim(`[DEBUG] No count match found in: ${input}`));
        }
      }
      
      // Add line to buffer
      this.multiLineBuffer.push(input);
      if (process.env.DEBUG_INPUT) {
        console.log(colors.dim(`[DEBUG] Buffer has ${this.multiLineBuffer.length} lines, expecting ${this.expectedLines}`));
      }
      
      // Check if we should stop buffering
      const currentNumber = input.match(/^(\d+)\./);
      if (currentNumber && this.expectedLines > 0 && parseInt(currentNumber[1]) >= this.expectedLines) {
        // We've reached the expected number, process it
        const fullInput = this.multiLineBuffer.join('\n');
        if (process.env.DEBUG_INPUT) {
          console.log(colors.dim(`[DEBUG] Processing full input with ${this.multiLineBuffer.length} lines`));
        }
        this.multiLineBuffer = [];
        this.multiLineMode = false;
        this.expectedLines = 0;
        
        // Clear input
        this.inputBuffer = '';
        this.cursorPosition = 0;
        
        // Add to history
        this.history.push(fullInput);
        if (this.history.length > 100) this.history.shift();
        this.historyIndex = -1;
        
        // Add user message
        this.addMessage('user', fullInput);
        
        // Process the complete multi-line input
        await this.processWithAI(fullInput);
        this.render();
        return;
      }
      
      // Clear input buffer for next line
      this.inputBuffer = '';
      this.cursorPosition = 0;
      
      // Don't process yet, wait for more lines
      this.render();
      return;
    }
    }
    
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
    if (process.env.DEBUG_TOOLS) {
      console.log(colors.dim(`\n🔍 Input routing check:`));
      console.log(colors.dim(`   Starts with '/': ${input.startsWith('/')}`));
      console.log(colors.dim(`   Is direct command: ${this.isDirectCommand(input)}`));
      console.log(colors.dim(`   First word: "${input.split(' ')[0]}"`));
    }
    
    if (input.startsWith('/')) {
      await this.handleCommand(input);
    } else if (this.isDirectCommand(input)) {
      if (process.env.DEBUG_TOOLS) {
        console.log(colors.warning('⚠️ Routing to executeCommand instead of AI!'));
      }
      await this.executeCommand(input);
    } else {
      if (process.env.DEBUG_TOOLS) {
        console.log(colors.info('✅ Routing to processWithAI'));
      }
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
      case 'history':
        this.showUserMessages = !this.showUserMessages;
        this.addMessage('system', `User message history ${this.showUserMessages ? 'shown' : 'hidden'} in display`);
        break;
      case 'context':
        this.showContextStats();
        break;
      case 'tools':
        this.showTools();
        break;
      case 'permissions':
        await this.showPermissions();
        break;
      case 'forge':
        await this.toggleToolForge();
        break;
      case 'forge-list':
        await this.listForgedTools();
        break;
      case 'forge-rollback':
        if (parts[1]) {
          await this.rollbackTool(parts[1], parts[2]);
        } else {
          this.addMessage('error', 'Usage: /forge-rollback <tool-name> [version]');
        }
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
    this.addMessage('system', colors.primary('═'.repeat(60)));
    this.addMessage('system', colors.primary.bold('🚀 OrionCLI - Your Smart AI Development Assistant'));
    this.addMessage('system', colors.primary('═'.repeat(60)));
    
    this.addMessage('system', '');
    this.addMessage('system', colors.accent.bold('📝 WHAT YOU CAN ASK:'));
    this.addMessage('system', colors.info('• "Create a plan for [project type]" → Generate architecture'));
    this.addMessage('system', colors.info('• "What is [filename] about?" → Read & explain files'));
    this.addMessage('system', colors.info('• "Edit [file] to [change]" → Modify code'));
    this.addMessage('system', colors.info('• "Search for [pattern]" → Find in codebase'));
    this.addMessage('system', colors.info('• "Run [command]" → Execute shell commands'));
    this.addMessage('system', colors.info('• "Commit my changes" → Git operations'));
    this.addMessage('system', colors.info('• "Fix the bug in [file]" → Debug assistance'));
    
    this.addMessage('system', '');
    this.addMessage('system', colors.accent.bold('💬 SLASH COMMANDS:'));
    this.addMessage('system', colors.success('/help') + '        - This guide');
    this.addMessage('system', colors.success('/clear') + '       - Clear chat');
    this.addMessage('system', colors.success('/models') + '      - List AI models');
    this.addMessage('system', colors.success('/model <name>') + ' - Switch model');
    this.addMessage('system', colors.success('/file <path>') + '  - Set active file');
    this.addMessage('system', colors.success('/auto') + '        - Auto-edit toggle');
    this.addMessage('system', colors.success('/history') + '     - Toggle user prompts display');
    this.addMessage('system', colors.success('/context') + '     - Show context & token stats');
    this.addMessage('system', colors.success('/tools') + '       - Show 54+ tools');
    this.addMessage('system', colors.success('/permissions') + '  - Manage permissions');
    this.addMessage('system', colors.success('/forge') + '       - Toggle ToolForge (experimental)');
    this.addMessage('system', colors.success('/forge-list') + '  - List forged tools');
    this.addMessage('system', colors.success('/about') + '       - About OrionCLI');
    this.addMessage('system', colors.success('/exit') + '        - Quit');
    
    this.addMessage('system', '');
    this.addMessage('system', colors.accent.bold('⌨️  SHORTCUTS:'));
    this.addMessage('system', colors.warning('Tab') + '          - Complete');
    this.addMessage('system', colors.warning('↑/↓') + '          - History');
    this.addMessage('system', colors.warning('Shift+Tab') + '    - Toggle auto-edit');
    this.addMessage('system', colors.warning('Ctrl+C') + '       - Exit');
    
    this.addMessage('system', '');
    this.addMessage('system', colors.accent.bold('💡 SMART FEATURES:'));
    this.addMessage('system', '• Auto tool selection');
    this.addMessage('system', '• Task planning with todos');
    this.addMessage('system', '• Error recovery');
    this.addMessage('system', '• Permission management');
    this.addMessage('system', '• Project understanding');
    
    this.addMessage('system', '');
    this.addMessage('system', colors.primary('═'.repeat(60)));
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

  async showPermissions() {
    const stats = this.permissionManager.getStats();
    
    this.addMessage('system', colors.primary.bold('📋 Permission Settings'));
    this.addMessage('system', colors.dim('─'.repeat(40)));
    this.addMessage('system', `Total Rules: ${stats.totalRules}`);
    this.addMessage('system', `  ${colors.success('✓ Allow')}: ${stats.allowRules}`);
    this.addMessage('system', `  ${colors.warning('? Ask')}: ${stats.askRules}`);
    this.addMessage('system', `  ${colors.error('✗ Deny')}: ${stats.denyRules}`);
    this.addMessage('system', `  Session: ${stats.sessionPermissions}`);
    this.addMessage('system', '');
    this.addMessage('system', colors.dim('Use /permissions to manage settings'));
    this.addMessage('system', colors.dim('Permissions are saved in ~/.orion/'));
  }

  showContextStats() {
    const stats = this.contextManager.getStats();
    const contextSize = this.contextManager.countMessageTokens(this.conversationHistory);
    const remaining = this.contextManager.getRemainingSpace(contextSize, this.config.model);
    
    this.addMessage('system', colors.primary.bold('📊 Context Management Stats'));
    this.addMessage('system', colors.dim('─'.repeat(40)));
    
    // Current usage
    this.addMessage('system', colors.info('Current Context:'));
    this.addMessage('system', `  Messages: ${this.conversationHistory.length}`);
    this.addMessage('system', `  Tokens: ${contextSize.toLocaleString()} / ${remaining.limit.toLocaleString()}`);
    this.addMessage('system', `  Usage: ${remaining.percentage}% ${this.getUsageBar(remaining.percentage)}`);
    this.addMessage('system', `  Status: ${
      remaining.status === 'good' ? colors.success(remaining.status) :
      remaining.status === 'moderate' ? colors.warning(remaining.status) :
      colors.error(remaining.status)
    }`);
    
    // Compaction stats
    this.addMessage('system', '');
    this.addMessage('system', colors.info('Compaction Settings:'));
    this.addMessage('system', `  Target before compact: ${(stats.targets.maxContext / 1000).toFixed(0)}K tokens`);
    this.addMessage('system', `  Target after compact: ${(stats.targets.compactTarget / 1000).toFixed(0)}K tokens`);
    this.addMessage('system', `  Compactions done: ${stats.compactionCount}`);
    
    // Model limits
    this.addMessage('system', '');
    this.addMessage('system', colors.info('Model Context Limits:'));
    Object.entries(stats.modelLimits).forEach(([model, limit]) => {
      const isCurrent = model === this.config.model;
      const marker = isCurrent ? colors.success('▸') : ' ';
      this.addMessage('system', `  ${marker} ${model}: ${(limit / 1000).toFixed(0)}K tokens`);
    });
    
    this.addMessage('system', '');
    this.addMessage('system', colors.dim('Smart context preserves key info during compaction'));
  }
  
  getUsageBar(percentage) {
    const width = 20;
    const filled = Math.floor(percentage / 100 * width);
    const empty = width - filled;
    
    let color = colors.success;
    if (percentage > 80) color = colors.error;
    else if (percentage > 50) color = colors.warning;
    
    return color('█'.repeat(filled)) + colors.dim('░'.repeat(empty));
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
    
    // Complex reasoning, planning, orchestration -> o3 (ENHANCED)
    if (/\b(analyze|think|reason|logic|complex|strategy|plan|architecture|design|solve|orchestrat|build|create|implement|develop|organize|structure)\b/.test(lowerInput)) {
      return 'o3';
    }
    
    // File operations that need understanding -> use gpt-5-chat for speed
    if (/\b(what is|explain|understand|describe|summarize|review)\b.*\b(file|code|content|about)\b/i.test(lowerInput)) {
      return 'gpt-5-chat';  // Fast and capable for file operations
    }
    
    // Multi-step tasks -> use gpt-5-chat for better tool execution
    if (/\b(step|then|after|next|first|second|finally|todo|tasks?)\b/.test(lowerInput)) {
      return 'gpt-5-chat';  // Better at executing multiple tools
    }
    
    // Visual content -> gpt-4o
    if (/\b(image|visual|picture|diagram|chart|see|view|look)\b/.test(lowerInput)) {
      return 'gpt-4o';
    }
    
    // Quick/simple questions -> o4-mini (only for truly simple stuff)
    if (input.length < 30 && /^(ls|pwd|date|time|help)$/i.test(input.trim())) {
      return 'o4-mini';
    }
    
    // Default to gpt-5-chat for better tool execution
    return this.config.model === 'o4-mini' ? 'gpt-5-chat' : this.config.model;
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
    this.startSpinner();
    
    // Debug: Log when processing starts
    if (process.env.DEBUG_TOOLS) {
      console.log(colors.dim(`\n🔍 Processing input: "${input.slice(0, 100)}..."`));
      console.log(colors.dim(`   Input length: ${input.length} chars`));
    }
    
    // Check for mega tasks FIRST - they must use SimpleOrchestrator with gpt-5-chat
    const needsOrchestration = this.simpleOrchestrator.needsOrchestration(input);
    
    if (process.env.DEBUG_TOOLS) {
      console.log(colors.dim(`\n🔍 EARLY Orchestration check: ${needsOrchestration ? 'YES - Mega task!' : 'NO - Regular task'}`));
      console.log(colors.dim(`   Numbered items found: ${(input.match(/\d+\./g) || []).length}`));
    }
    
    // Use intelligent task understanding system
    const intentAnalysis = await this.taskUnderstanding.analyzeIntent(input);
    
    // Fallback to basic analysis if needed
    const taskInfo = intentAnalysis.primaryIntent ? 
      {
        type: intentAnalysis.primaryIntent,
        needsTools: intentAnalysis.suggestedTools && intentAnalysis.suggestedTools.length > 0,
        tools: intentAnalysis.suggestedTools || [],
        priority: intentAnalysis.confidence > 0.8 ? 'high' : intentAnalysis.confidence > 0.5 ? 'medium' : 'low'
      } : 
      this.analyzeTask(input);
    
    // Force gpt-5-chat for mega tasks, otherwise use optimal model
    const optimalModel = needsOrchestration ? 'gpt-5-chat' : this.selectModelForTask(input);
    
    if (process.env.DEBUG_TOOLS) {
      console.log(colors.dim(`   Selected model: ${optimalModel} (forced: ${needsOrchestration ? 'YES' : 'NO'})`));
    }
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
    
    // Show smart suggestions if available
    if (intentAnalysis && intentAnalysis.suggestions && intentAnalysis.suggestions.length > 0) {
      this.addMessage('system', colors.info('💡 ' + intentAnalysis.suggestions[0]));
      this.render();
    }
    
    // Show thinking indicator with confidence
    const confidenceText = intentAnalysis && intentAnalysis.confidence > 0.8 ? ' (high confidence)' : 
                           intentAnalysis && intentAnalysis.confidence > 0.5 ? ' (medium confidence)' : '';
    this.addMessage('system', colors.info(`💭 Thinking${confidenceText}...`));
    this.render();
    
    try {
      // Build enhanced context with intelligence
      const contextInfo = this.buildContext(input, taskInfo);
      if (intentAnalysis && intentAnalysis.context) {
        Object.assign(contextInfo, intentAnalysis.context);
      }
      
      if (process.env.DEBUG_TOOLS) {
        console.log(colors.dim(`\n🔍 Orchestration check: ${needsOrchestration ? 'YES - Mega task!' : 'NO - Regular task'}`));
      }
      
      if (needsOrchestration) {
        // Use simple orchestrator for reliability
        this.addMessage('system', colors.info('🎯 Mega task detected - using orchestration'));
        this.render();
        
        // Pass the config so orchestrator can create proper clients
        const orchestrationResult = await this.simpleOrchestrator.orchestrate(
          input,
          { client: usingClient, config: this.loadConfig.bind(this), createClient: this.createClient.bind(this) },
          this.buildSystemPrompt(taskInfo, contextInfo),
          async (toolResponse) => {
            // Process tool execution from orchestrator
            const parsed = JsonToolParser.processResponse(toolResponse);
            if (parsed.hasTools && parsed.toolCalls.length > 0) {
              for (const toolCall of parsed.toolCalls) {
                await this.handleToolCalls([toolCall]);
              }
            }
          }
        );
        
        if (orchestrationResult) {
          if (orchestrationResult.success) {
            this.addMessage('assistant', `✅ Completed ${orchestrationResult.completedSteps} steps successfully!`);
          } else {
            this.addMessage('assistant', `Completed ${orchestrationResult.completedSteps || 0} steps with ${orchestrationResult.errors || 0} errors.`);
          }
          this.render();
          return; // IMPORTANT: Exit here to prevent regular execution
        } else {
          this.addMessage('system', colors.warning('⚠️ Orchestration failed, falling back to regular execution'));
        }
      }
      
      // For non-mega tasks, proceed with regular AI processing
      
      // Add user message to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: input
      });
      
      // Smart context management - handles up to 1M tokens then compacts
      this.conversationHistory = await this.contextManager.manageContext(
        this.conversationHistory, 
        usingConfig.model
      );
      
      // Get context statistics
      const contextStats = this.contextManager.getRemainingSpace(
        this.contextManager.countMessageTokens(this.conversationHistory),
        usingConfig.model
      );
      
      // Show context status if getting full
      if (contextStats.status === 'critical') {
        this.addMessage('system', colors.warning(`⚠️ Context ${contextStats.percentage}% full - may compact soon`));
      }
      
      // Enhanced system prompt with tool awareness  
      const systemPrompt = this.buildSystemPrompt(taskInfo, contextInfo);
      
      // Build messages array with smart context
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        // Use intelligently managed conversation history
        ...this.conversationHistory
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
        const toolDefs = this.toolRegistry.getToolDefinitions(taskInfo.tools);
        if (toolDefs && toolDefs.length > 0) {
          completionParams.tools = toolDefs;
          completionParams.tool_choice = 'auto'; // Let AI decide when to use tools
          
          // Debug: Show what tools are being provided
          if (process.env.DEBUG_TOOLS) {
            console.log(colors.dim(`📦 Providing ${toolDefs.length} tools to AI for: ${taskInfo.type}`));
            toolDefs.forEach(t => {
              console.log(colors.dim(`  - ${t.function.name}: ${t.function.description}`));
            });
          }
        }
      }

      // Debug: Log API call attempt
      if (process.env.DEBUG_TOOLS) {
        console.log(colors.dim(`\n📡 Calling Azure OpenAI API...`));
        console.log(colors.dim(`  Model: ${completionParams.model}`));
        console.log(colors.dim(`  Tools provided: ${completionParams.tools ? completionParams.tools.length : 0}`));
      }
      
      const completion = await usingClient.chat.completions.create(completionParams);
      const response = completion.choices[0].message.content;
      
      // Debug: Log response received
      if (process.env.DEBUG_TOOLS) {
        console.log(colors.dim(`\n✅ Got response from API`));
        console.log(colors.dim(`  Response length: ${response ? response.length : 0}`));
        if (response) {
          console.log(colors.dim(`  First 500 chars: ${response.substring(0, 500)}`));
        }
      }
      
      // Handle tool calls if present (proper OpenAI format)
      if (completion.choices[0].message.tool_calls) {
        await this.handleToolCalls(completion.choices[0].message.tool_calls);
      }
      
      // Check for JSON tool calls in response (Azure OpenAI fallback)
      let parsed = { toolCalls: [], cleanText: '', hasTools: false };
      if (response) {
        parsed = JsonToolParser.processResponse(response);
        
        // Debug logging
        if (process.env.DEBUG_TOOLS) {
          console.log(colors.dim(`🔍 Parsing response for JSON tools...`));
          console.log(colors.dim(`  Response length: ${response.length}`));
          console.log(colors.dim(`  Has tools: ${parsed.hasTools}`));
          console.log(colors.dim(`  Tool calls found: ${parsed.toolCalls.length}`));
          if (parsed.hasTools) {
            parsed.toolCalls.forEach(tc => {
              console.log(colors.dim(`  → ${tc.function.name}`));
            });
          }
        }
        
        // If JSON tools were found, execute them
        if (parsed.hasTools && parsed.toolCalls.length > 0) {
          // Execute the extracted tool calls
          for (const toolCall of parsed.toolCalls) {
            await this.handleToolCalls([toolCall]);
          }
          
          // Show cleaned response if there is any
          if (parsed.cleanText && parsed.cleanText.trim()) {
            // Add as single message to avoid multiple renders
            this.addMessage('assistant', parsed.cleanText);
          } else if (parsed.toolCalls.length > 0) {
            // If ONLY tools were executed (no text), add success confirmation
            const toolNames = parsed.toolCalls.map(tc => tc.function.name);
            if (toolNames.includes('write_file') || toolNames.includes('create_file')) {
              this.addMessage('assistant', '✅ File created successfully!');
            } else if (toolNames.includes('edit_file')) {
              this.addMessage('assistant', '✅ File updated successfully!');
            } else if (toolNames.includes('execute_bash')) {
              // Bash output is already shown, just confirm
              this.addMessage('assistant', '✅ Command executed!');
            } else if (toolNames.length > 0) {
              this.addMessage('assistant', '✅ Done!');
            }
          }
          
          // Auto-continuation disabled - use SimpleOrchestrator for mega tasks
        } else if (response) {
          // No JSON tools found - but check if response IS just JSON (shouldn't show it)
          // Skip showing response if it looks like a failed tool JSON
          const looksLikeJson = response.trim().startsWith('{') && response.includes('"tool"');
          if (!looksLikeJson) {
            // Only show non-JSON responses
            this.addMessage('assistant', response);
          } else {
            // Log that we're skipping JSON that wasn't parsed
            if (process.env.DEBUG_TOOLS) {
              console.log(colors.warning('⚠️ Skipping unparsed JSON response'));
            }
          }
        }
        
        // Add assistant response to conversation history
        this.conversationHistory.push({
          role: 'assistant',
          content: parsed.cleanText || response
        });
      }
    } catch (error) {
      console.error('Error in processWithAI:', error);
      this.addMessage('error', `Error: ${error.message}`);
      
      // More detailed error info in debug mode
      if (process.env.DEBUG_TOOLS) {
        console.error('Full error stack:', error.stack);
      }
    } finally {
      // Debug: Confirm finally block executes
      if (process.env.DEBUG_TOOLS) {
        console.log(colors.dim('\n🏁 Finally block: Stopping spinner and clearing processing flag'));
      }
      this.isProcessing = false;
      this.stopSpinner();
      
      // Ensure input buffer is ready for next input
      this.inputBuffer = '';
      this.cursorPosition = 0;
      
      // Just refresh the input area after a short delay
      setTimeout(() => {
        this.render();
      }, 100);
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
    let prompt = `You are OrionCLI, an AI assistant that TAKES ACTION IMMEDIATELY.

🚀 PRIME DIRECTIVE: BE DECISIVE - DON'T ASK, JUST DO!

When user asks for:
• "Create a mermaid diagram" → Create flowchart.md with example diagram NOW
• "Create a file" → Create example.txt with sample content NOW  
• "Create X" → Create it with reasonable defaults NOW
• Anything vague → Make smart assumptions and DO IT

NEVER SAY:
❌ "What type would you like?"
❌ "Could you clarify?"
❌ "What should it contain?"
❌ "Would you prefer X or Y?"

ALWAYS:
✅ Take immediate action
✅ Use reasonable defaults
✅ Create something useful
✅ Output tool JSON immediately

TOOL OUTPUT RULES:
• When using tools, output ONLY valid JSON - nothing else
• JSON must be complete and valid: {"tool": "write_file", "args": {"filename": "test.txt", "content": "content here"}}
• Do NOT output text before or after the JSON
• The system will confirm success automatically - you don't need to

MULTI-TOOL EXECUTION:
• For complex tasks requiring multiple tools, execute them ALL in sequence
• Don't stop after one tool - continue with the next steps
• Output each tool JSON on a separate line
• Example for "read package.json and create a summary":
  {"tool": "read_file", "args": {"filename": "package.json"}}
  {"tool": "write_file", "args": {"filename": "summary.md", "content": "Summary content here..."}}
• Keep executing tools until the ENTIRE task is complete

MEGA-TASK EXECUTION (20+ operations):
• Break the task into logical chunks but EXECUTE ALL OF THEM
• Create directories first, then files inside them
• For each major step, output the appropriate tool JSON
• DO NOT STOP until you've addressed EVERY part of the request
• If the user asks for 30 things, do ALL 30 things
• Example approach for mega-tasks:
  1. Parse the entire request and identify ALL operations needed
  2. Execute them in logical order (directories before files)
  3. Continue outputting tool JSONs until complete
• CRITICAL: You must be as capable as Claude - handle everything!

AUTONOMOUS ERROR HANDLING & RECOVERY:
• If a tool fails, AUTOMATICALLY try an alternative approach
• Directory doesn't exist? Create it with mkdir -p first
• File not found? Check if path is correct, try alternative paths
• Permission denied? Try with sudo or alternative location
• Command fails? Try variations or workarounds
• NEVER give up - always find a solution
• Example recovery patterns:
  - write_file fails → try execute_bash with echo > file
  - read_file fails → try execute_bash with cat
  - mkdir fails → try execute_bash with mkdir -p
  - Complex operation fails → break into simpler steps
• BE CREATIVE: If standard approach fails, use bash commands
• PERSISTENCE: Keep trying different approaches until success
    
Current Context:
- Working Directory: ${contextInfo.workingDir}
- Active File: ${contextInfo.activeFile || 'none'}
- Task Type: ${taskInfo.type}
- Session Time: ${Math.floor(contextInfo.sessionTime / 60)}m

Available Tools: ${taskInfo.needsTools ? taskInfo.tools.join(', ') : 'none required'}

${taskInfo.needsTools ? '\n⚠️ TOOLS ARE AVAILABLE - USE THEM PROPERLY, NOT AS JSON OUTPUT!' : ''}`;

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
      prompt += `\n\nCRITICAL FILE OPERATION RULES:
      
WHEN USER ASKS "What is [filename] about?" or similar:
1. Use read_file tool with filename parameter IMMEDIATELY
2. DO NOT use list_files first
3. DO NOT ask for confirmation
4. After reading, explain the contents in natural language

Examples:
- "What is README about?" → read_file(filename: "README.md")
- "What is package.json?" → read_file(filename: "package.json")
- "Show me the config" → read_file(filename: "config.js" or similar)

NEVER list files when asked about a specific file!
ALWAYS read the file directly!`;
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
    
    // CRITICAL: Provide EXACT JSON structures for ALL tools to ensure parser understands
    prompt += `\n\n⚠️ CRITICAL TOOL USAGE INSTRUCTIONS ⚠️
Output tools as EXACT JSON on a single line. Here are ALL available tool formats:

FILE OPERATIONS (use these exact structures):
• Create directory: {"tool": "execute_bash", "args": {"command": "mkdir -p directory_name"}}
• Create file: {"tool": "write_file", "args": {"filename": "name.ext", "content": "file content here"}}
• Create file in directory: {"tool": "write_file", "args": {"filename": "dir/name.ext", "content": "content"}}
• Read file: {"tool": "read_file", "args": {"filename": "name.ext"}}  
• Edit file: {"tool": "edit_file", "args": {"filename": "name.ext", "old_text": "text to find", "new_text": "replacement"}}
• List files: {"tool": "list_files", "args": {"directory": "."}}
• Delete file: {"tool": "delete_file", "args": {"filename": "name.ext", "force": false}}
• Append to file: {"tool": "update_file", "args": {"filename": "name.ext", "content": "text to add", "mode": "append"}}
• Check exists: {"tool": "file_exists", "args": {"filename": "name.ext"}}

BASH/SYSTEM:
• Run command: {"tool": "execute_bash", "args": {"command": "ls -la"}}

GIT OPERATIONS:
• Status: {"tool": "git_status", "args": {}}
• Commit: {"tool": "git_commit", "args": {"message": "commit message"}}
• Diff: {"tool": "git_diff", "args": {"cached": false}}
• Push: {"tool": "git_push", "args": {"branch": "main"}}
• Pull: {"tool": "git_pull", "args": {}}

SEARCH:
• Web search: {"tool": "web_search", "args": {"query": "search terms"}}

ABSOLUTE REQUIREMENTS:
✅ Output COMPLETE JSON - never partial like {"tool": "x", "args": }
✅ Use ACTUAL values, not placeholders
✅ One JSON per line, no explanations around it
✅ The filename/content must be EXACTLY what user wants
✅ Empty args still need {} like {"tool": "git_status", "args": {}}

❌ NEVER output incomplete JSON
❌ NEVER use placeholder values
❌ NEVER explain the JSON before/after outputting it`;
    
    return prompt;
  }
  
  // OLD METHOD REMOVED - Now using modular OrionToolRegistry
  
  async handleToolCalls(toolCalls) {
    if (process.env.DEBUG_TOOLS) {
      console.log(colors.dim(`\n🔨 handleToolCalls invoked with ${toolCalls ? toolCalls.length : 0} tool(s)`));
    }
    for (const toolCall of toolCalls) {
      // Show minimal tool execution indicator
      this.addMessage('system', colors.tool(`🔧 ${toolCall.function.name}`));
      // Don't render for each tool - batch at the end
      
      try {
        const args = JSON.parse(toolCall.function.arguments);
        let result = '';
        let retries = 0;
        const maxRetries = 2;
        
        // Retry logic for tool execution
        while (retries <= maxRetries) {
          try {
            // Handle built-in tools
            if (toolCall.function.name === 'execute_bash') {
              result = await this.executeBashCommand(args.command);
            } else if (toolCall.function.name === 'web_search') {
              result = `Web search for "${args.query}" would be performed here`;
            } else {
              // Use modular tool registry for all other tools
              result = await this.toolRegistry.executeTool(toolCall.function.name, args);
            }
            
            // Success - break retry loop
            break;
          } catch (toolError) {
            retries++;
            if (retries > maxRetries) {
              // Max retries reached, try to recover
              this.addMessage('system', colors.warning(`⚠️ Tool failed, attempting smart recovery...`));
              
              // Smart recovery based on error type and tool
              if (toolCall.function.name === 'write_file' || toolCall.function.name === 'create_file') {
                // Check if directory exists, create if needed
                const path = require('path');
                const dir = path.dirname(args.filename || args.path);
                if (dir && dir !== '.') {
                  try {
                    await this.executeBashCommand(`mkdir -p ${dir}`);
                    this.addMessage('system', colors.success(`✅ Created directory: ${dir}`));
                  } catch (e) {
                    // Directory creation failed, but continue anyway
                  }
                }
                
                // Try bash echo as fallback
                try {
                  const filename = args.filename || args.path;
                  const content = (args.content || '').replace(/'/g, "'\\''");
                  await this.executeBashCommand(`echo '${content}' > ${filename}`);
                  result = { output: `✅ File created via bash: ${filename}` };
                } catch (e) {
                  // Last resort - basic file write
                  const fs = require('fs').promises;
                  await fs.writeFile(args.filename || args.path, args.content || '', 'utf8');
                  result = { output: `✅ File created via fallback: ${args.filename || args.path}` };
                }
              } else if (toolCall.function.name === 'read_file') {
                // Try bash cat as fallback
                try {
                  const output = await this.executeBashCommand(`cat ${args.filename}`);
                  result = { output };
                } catch (e) {
                  throw toolError;
                }
              } else if (toolCall.function.name === 'list_files') {
                // Try bash ls as fallback
                try {
                  const output = await this.executeBashCommand(`ls -la ${args.directory || '.'}`);
                  result = { output };
                } catch (e) {
                  throw toolError;
                }
              } else {
                throw toolError;
              }
            } else {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 500 * retries));
            }
          }
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
        // Don't render inside loop
        
      } catch (error) {
        // Try ToolForge if enabled and it looks like a missing tool
        if (this.toolForgeEnabled && this.toolForge.enabled) {
          const shouldRetry = await this.toolForge.handleToolError(error, {
            toolCall,
            input: this.messages[this.messages.length - 1]
          });
          
          if (shouldRetry) {
            // Retry the tool call with the newly forged tool
            this.addMessage('system', colors.dim('🔄 Retrying with forged tool...'));
            // Re-execute the same tool with same args
            try {
              const result = await this.toolRegistry.executeTool(toolCall.function.name, JSON.parse(toolCall.function.arguments));
              this.addMessage('tool', colors.success(typeof result === 'object' ? (result.output || JSON.stringify(result, null, 2)) : String(result)));
              continue; // Skip the error message below
            } catch (retryError) {
              // Forged tool still failed
              this.addMessage('error', `Forged tool failed: ${retryError.message}`);
            }
          }
        }
        
        this.addMessage('error', `${error.message}`);
        // Don't render inside loop
      }
    }
    // Single render after all tools complete
    this.render();
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

  // ToolForge Methods
  async toggleToolForge() {
    this.toolForgeEnabled = !this.toolForgeEnabled;
    
    if (this.toolForgeEnabled) {
      // Initialize ToolForge with current context
      await this.toolForge.init(
        { client: this.client, config: this.loadConfig.bind(this), createClient: this.createClient.bind(this) },
        this.toolRegistry
      );
      this.toolForge.enable();
      this.addMessage('system', colors.success('🔧 ToolForge ENABLED - Experimental self-improving tool creation active'));
      this.addMessage('system', colors.warning('⚠️  Warning: This is experimental. Tools will be auto-generated and tested.'));
      this.addMessage('system', colors.dim('Use /forge-rollback to revert problematic tools'));
    } else {
      this.toolForge.disable();
      this.addMessage('system', colors.dim('🔧 ToolForge DISABLED'));
    }
  }

  async listForgedTools() {
    if (!this.toolForgeEnabled) {
      this.addMessage('error', 'ToolForge is not enabled. Use /forge to enable.');
      return;
    }
    
    const tools = await this.toolForge.listForgedTools();
    
    if (tools.length === 0) {
      this.addMessage('system', colors.dim('No forged tools yet'));
      return;
    }
    
    this.addMessage('system', colors.primary('🔧 Forged Tools:'));
    for (const tool of tools) {
      this.addMessage('system', colors.info(
        `  • ${tool.name} v${tool.activeVersion} (${tool.versions} version${tool.versions > 1 ? 's' : ''})`
      ));
      
      // Show version details if available
      if (this.toolForge.forge) {
        const versions = await this.toolForge.forge.listVersions(tool.name);
        if (versions && versions.length > 0) {
          versions.slice(-2).forEach(v => {
            this.addMessage('system', colors.dim(
              `    - v${v.version} ${v.active ? '(active)' : ''}: ${v.notes}`
            ));
          });
        }
      }
    }
    
    // Show recent history
    const history = this.toolForge.getHistory().slice(-5);
    if (history.length > 0) {
      this.addMessage('system', colors.dim('\nRecent activity:'));
      for (const entry of history) {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        this.addMessage('system', colors.dim(
          `  [${time}] ${entry.action} ${entry.tool} v${entry.version}`
        ));
      }
    }
  }

  async rollbackTool(toolName, version = null) {
    if (!this.toolForgeEnabled) {
      this.addMessage('error', 'ToolForge is not enabled. Use /forge to enable.');
      return;
    }
    
    const success = await this.toolForge.rollbackTool(toolName, version);
    
    if (success) {
      this.addMessage('system', colors.success(`✅ Rolled back ${toolName}`));
    } else {
      this.addMessage('error', `Failed to rollback ${toolName}`);
    }
  }

  exit() {
    process.stdout.write('\x1B[?25h'); // Show cursor
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