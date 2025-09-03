/**
 * Terminal Renderer - Flicker-free terminal UI rendering
 * Manages the terminal display without React/Ink
 */

import * as readline from 'readline';
import chalk from 'chalk';
import boxen from 'boxen';
import stripAnsi from 'strip-ansi';
import wrapAnsi from 'wrap-ansi';

interface RenderState {
  messages: Message[];
  inputValue: string;
  cursorPosition: number;
  isProcessing: boolean;
  autoEditEnabled: boolean;
  currentModel: string;
  activeFile?: string;
  mcpStatus?: string;
  showCommandSuggestions: boolean;
  commandSuggestions: string[];
  selectedSuggestionIndex: number;
  confirmationDialog?: ConfirmationOptions;
  processingTime?: number;
  tokenCount?: number;
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  toolName?: string;
  fileName?: string;
  diff?: DiffContent;
  timestamp: Date;
}

interface DiffContent {
  oldContent: string;
  newContent: string;
  fileName: string;
}

interface ConfirmationOptions {
  title: string;
  message: string;
  diff?: DiffContent;
  options: string[];
  selectedIndex: number;
}

export class TerminalRenderer {
  private rl: readline.Interface;
  private state: RenderState;
  private lastRender: string = '';
  private terminalWidth: number;
  private terminalHeight: number;
  private renderTimeout?: NodeJS.Timeout;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    this.state = {
      messages: [],
      inputValue: '',
      cursorPosition: 0,
      isProcessing: false,
      autoEditEnabled: false,
      currentModel: 'gpt-5-chat',
      showCommandSuggestions: false,
      commandSuggestions: [],
      selectedSuggestionIndex: 0,
    };

    this.terminalWidth = process.stdout.columns || 80;
    this.terminalHeight = process.stdout.rows || 24;

    // Handle terminal resize
    process.stdout.on('resize', () => {
      this.terminalWidth = process.stdout.columns || 80;
      this.terminalHeight = process.stdout.rows || 24;
      this.render();
    });
  }

  /**
   * Main render function - updates the entire terminal display
   */
  public render(): void {
    // Debounce rapid renders to prevent flicker
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }

    this.renderTimeout = setTimeout(() => {
      this._performRender();
    }, 16); // ~60fps max
  }

  private _performRender(): void {
    const output: string[] = [];
    
    // Clear screen and reset cursor
    output.push('\x1B[2J\x1B[H');

    // Render header/logo
    output.push(this.renderHeader());
    output.push('');

    // Render chat history
    const chatHeight = this.calculateChatHeight();
    output.push(this.renderChatHistory(chatHeight));
    
    // Render status line
    output.push(this.renderStatusLine());
    output.push('');

    // Render input box
    output.push(this.renderInputBox());

    // Render overlays (confirmations, suggestions)
    if (this.state.confirmationDialog) {
      output.push(this.renderConfirmationDialog());
    } else if (this.state.showCommandSuggestions) {
      output.push(this.renderCommandSuggestions());
    }

    // Join and write to stdout
    const rendered = output.join('\n');
    
    // Only write if content changed (reduces flicker)
    if (rendered !== this.lastRender) {
      process.stdout.write(rendered);
      this.lastRender = rendered;
    }

    // Position cursor in input box
    this.positionCursor();
  }

  private renderHeader(): string {
    const logo = chalk.cyan.bold(`
╔═══════════════════╗
║   ORION CLI v2    ║
║  Azure OpenAI     ║
╚═══════════════════╝
    `.trim());
    return logo;
  }

  private renderChatHistory(maxHeight: number): string {
    const messages = this.state.messages.slice(-maxHeight);
    const lines: string[] = [];

    for (const msg of messages) {
      switch (msg.type) {
        case 'user':
          lines.push(chalk.green('> ') + chalk.white(msg.content));
          break;
        
        case 'assistant':
          const formatted = this.formatMarkdown(msg.content);
          lines.push(chalk.blue('⏺ ') + formatted);
          break;
        
        case 'tool':
          const toolLine = chalk.yellow(`⏺ ${msg.toolName}`) + 
                          (msg.fileName ? chalk.gray(`(${msg.fileName})`) : '');
          lines.push(toolLine);
          
          if (msg.diff) {
            lines.push(this.renderDiff(msg.diff));
          }
          break;
        
        case 'system':
          lines.push(chalk.gray('⏺ ') + chalk.gray(msg.content));
          break;
      }
      lines.push(''); // Add spacing between messages
    }

    return lines.join('\n');
  }

  private renderStatusLine(): string {
    const parts: string[] = [];

    // Auto-edit status
    const autoEditIcon = this.state.autoEditEnabled ? '▶' : '⏸';
    const autoEditText = chalk.cyan(`${autoEditIcon} auto-edit: ${this.state.autoEditEnabled ? 'on' : 'off'}`);
    parts.push(autoEditText);

    // Current model
    parts.push(chalk.magenta(`≋ ${this.state.currentModel}`));

    // Active file
    if (this.state.activeFile) {
      parts.push(chalk.yellow(`📝 ${this.state.activeFile}`));
    }

    // MCP status
    if (this.state.mcpStatus) {
      parts.push(chalk.green(`◆ MCP: ${this.state.mcpStatus}`));
    }

    // Processing indicator
    if (this.state.isProcessing) {
      const spinner = this.getSpinner();
      const timeStr = this.state.processingTime ? ` ${this.state.processingTime}s` : '';
      const tokenStr = this.state.tokenCount ? ` (${this.state.tokenCount} tokens)` : '';
      parts.push(chalk.yellow(`${spinner} Processing${timeStr}${tokenStr}`));
    }

    return chalk.dim('─'.repeat(this.terminalWidth)) + '\n' + parts.join(chalk.dim(' │ '));
  }

  private renderInputBox(): string {
    const borderColor = this.state.isProcessing ? chalk.yellow : chalk.blue;
    const width = Math.min(this.terminalWidth - 4, 100);
    
    // Split input into lines for multiline support
    const lines = this.state.inputValue.split('\n');
    const displayLines = lines.map((line, i) => {
      const prefix = i === 0 ? '❯ ' : '│ ';
      return prefix + line;
    });

    // Add cursor
    if (!this.state.isProcessing) {
      const cursorLine = this.getCursorLine();
      const cursorCol = this.getCursorColumn();
      if (displayLines[cursorLine]) {
        const line = displayLines[cursorLine];
        displayLines[cursorLine] = 
          line.substring(0, cursorCol + 2) + 
          chalk.inverse(' ') + 
          line.substring(cursorCol + 3);
      }
    }

    // Create box
    const content = displayLines.join('\n') || chalk.gray('Ask me anything...');
    const box = boxen(content, {
      padding: 1,
      margin: 0,
      borderStyle: 'round',
      borderColor: this.state.isProcessing ? 'yellow' : 'blue',
      width,
    });

    return box;
  }

  private renderDiff(diff: DiffContent): string {
    // Simplified diff rendering - full implementation would be more complex
    const lines: string[] = [''];
    lines.push(chalk.gray(`--- ${diff.fileName}`));
    lines.push(chalk.gray(`+++ ${diff.fileName} (modified)`));
    
    // This is a simplified version - real implementation would compute actual diff
    const oldLines = diff.oldContent.split('\n');
    const newLines = diff.newContent.split('\n');
    
    // Show first few lines of changes
    for (let i = 0; i < Math.min(5, Math.max(oldLines.length, newLines.length)); i++) {
      if (oldLines[i] !== newLines[i]) {
        if (oldLines[i]) lines.push(chalk.red(`- ${oldLines[i]}`));
        if (newLines[i]) lines.push(chalk.green(`+ ${newLines[i]}`));
      }
    }
    
    return lines.join('\n');
  }

  private renderConfirmationDialog(): string {
    if (!this.state.confirmationDialog) return '';
    
    const dialog = this.state.confirmationDialog;
    const lines: string[] = [];
    
    // Create overlay effect
    lines.push('\n' + chalk.dim('─'.repeat(this.terminalWidth)));
    lines.push(chalk.yellow.bold(dialog.title));
    lines.push(dialog.message);
    
    if (dialog.diff) {
      lines.push(this.renderDiff(dialog.diff));
    }
    
    lines.push('');
    dialog.options.forEach((option, i) => {
      const selected = i === dialog.selectedIndex;
      const prefix = selected ? chalk.cyan('▶ ') : '  ';
      const text = selected ? chalk.cyan(option) : option;
      lines.push(prefix + text);
    });
    
    lines.push('');
    lines.push(chalk.gray('↑↓ Navigate • Enter Select • Esc Cancel'));
    
    return boxen(lines.join('\n'), {
      padding: 1,
      borderStyle: 'double',
      borderColor: 'yellow',
      float: 'center',
    });
  }

  private renderCommandSuggestions(): string {
    if (!this.state.showCommandSuggestions || this.state.commandSuggestions.length === 0) {
      return '';
    }
    
    const lines = this.state.commandSuggestions.map((cmd, i) => {
      const selected = i === this.state.selectedSuggestionIndex;
      const prefix = selected ? chalk.cyan('▶ ') : '  ';
      const text = selected ? chalk.cyan(cmd) : chalk.gray(cmd);
      return prefix + text;
    });
    
    return '\n' + boxen(lines.join('\n'), {
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      borderStyle: 'single',
      borderColor: 'gray',
      width: 30,
    });
  }

  private formatMarkdown(text: string): string {
    // Basic markdown formatting
    let formatted = text;
    
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, (_, p1) => chalk.bold(p1));
    
    // Code blocks
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return chalk.gray('```' + lang + '\n') + chalk.green(code) + chalk.gray('```');
    });
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, (_, p1) => chalk.green(p1));
    
    return formatted;
  }

  private calculateChatHeight(): number {
    // Reserve space for header, status, input box, etc.
    const reservedLines = 12;
    return Math.max(5, this.terminalHeight - reservedLines);
  }

  private getSpinner(): string {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    return frames[Math.floor(Date.now() / 100) % frames.length];
  }

  private getCursorLine(): number {
    const beforeCursor = this.state.inputValue.substring(0, this.state.cursorPosition);
    return beforeCursor.split('\n').length - 1;
  }

  private getCursorColumn(): number {
    const beforeCursor = this.state.inputValue.substring(0, this.state.cursorPosition);
    const lines = beforeCursor.split('\n');
    return lines[lines.length - 1].length;
  }

  private positionCursor(): void {
    // Calculate actual cursor position on screen
    // This would need proper ANSI escape sequences
    const row = this.terminalHeight - 3; // Approximate position
    const col = this.getCursorColumn() + 3; // Account for prompt
    process.stdout.write(`\x1B[${row};${col}H`);
  }

  // Public API methods for updating state

  public addMessage(message: Omit<Message, 'id' | 'timestamp'>): void {
    this.state.messages.push({
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    });
    this.render();
  }

  public updateInput(value: string, cursorPos: number): void {
    this.state.inputValue = value;
    this.state.cursorPosition = cursorPos;
    this.render();
  }

  public setProcessing(isProcessing: boolean): void {
    this.state.isProcessing = isProcessing;
    this.render();
  }

  public setAutoEdit(enabled: boolean): void {
    this.state.autoEditEnabled = enabled;
    this.render();
  }

  public setModel(model: string): void {
    this.state.currentModel = model;
    this.render();
  }

  public setActiveFile(file?: string): void {
    this.state.activeFile = file;
    this.render();
  }

  public showConfirmation(options: ConfirmationOptions): void {
    this.state.confirmationDialog = options;
    this.render();
  }

  public hideConfirmation(): void {
    this.state.confirmationDialog = undefined;
    this.render();
  }

  public showCommandSuggestions(suggestions: string[]): void {
    this.state.commandSuggestions = suggestions;
    this.state.showCommandSuggestions = true;
    this.state.selectedSuggestionIndex = 0;
    this.render();
  }

  public hideCommandSuggestions(): void {
    this.state.showCommandSuggestions = false;
    this.render();
  }

  public selectNextSuggestion(): void {
    if (this.state.showCommandSuggestions) {
      this.state.selectedSuggestionIndex = 
        (this.state.selectedSuggestionIndex + 1) % this.state.commandSuggestions.length;
      this.render();
    }
  }

  public selectPreviousSuggestion(): void {
    if (this.state.showCommandSuggestions) {
      this.state.selectedSuggestionIndex = 
        this.state.selectedSuggestionIndex === 0 
          ? this.state.commandSuggestions.length - 1
          : this.state.selectedSuggestionIndex - 1;
      this.render();
    }
  }

  public getCurrentSuggestion(): string | undefined {
    if (this.state.showCommandSuggestions) {
      return this.state.commandSuggestions[this.state.selectedSuggestionIndex];
    }
  }

  public clear(): void {
    this.state.messages = [];
    this.render();
  }

  public destroy(): void {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }
    this.rl.close();
  }
}
export interface TerminalRenderer {
  setMCPStatus(status: string): void;
  setTokenCount(count: number): void;
  state: { isProcessing: boolean };
}
