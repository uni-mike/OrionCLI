/**
 * Advanced Input Handler - Handles all keyboard input with history, shortcuts, and multiline support
 * Ported from grok-cli with enhancements for flicker-free rendering
 */

import * as readline from 'readline';
import { TerminalRenderer } from '../terminal/renderer';
import { CommandProcessor } from '../commands/processor';
import chalk from 'chalk';
import ansiEscapes from 'ansi-escapes';

export type InputCallback = (input: string) => Promise<void>;
export type SpecialKeyCallback = (key: string) => Promise<void>;

interface InputState {
  value: string;
  cursorPosition: number;
  history: string[];
  historyIndex: number;
  isMultiline: boolean;
  commandSuggestions: string[];
  showingSuggestions: boolean;
}

export class InputHandler {
  private rl: readline.Interface;
  private renderer: TerminalRenderer;
  private onInput: InputCallback;
  private onSpecialKey: SpecialKeyCallback;
  private commandProcessor?: CommandProcessor;
  private state: InputState;
  private isActive: boolean = false;

  constructor(
    renderer: TerminalRenderer,
    onInput: InputCallback,
    onSpecialKey: SpecialKeyCallback,
    commandProcessor?: CommandProcessor
  ) {
    this.renderer = renderer;
    this.onInput = onInput;
    this.onSpecialKey = onSpecialKey;
    this.commandProcessor = commandProcessor;
    
    this.state = {
      value: '',
      cursorPosition: 0,
      history: [],
      historyIndex: -1,
      isMultiline: false,
      commandSuggestions: [],
      showingSuggestions: false,
    };
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      historySize: 100,
    });
    
    // Set up raw mode for advanced input handling
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle raw keypress events
    process.stdin.on('data', async (key: Buffer) => {
      if (!this.isActive) return;
      
      const char = key.toString();
      const code = key[0];
      
      // Special key combinations
      if (key.length === 1) {
        switch (code) {
          case 0x03: // Ctrl+C
            await this.onSpecialKey('ctrl+c');
            break;
            
          case 0x0C: // Ctrl+L
            await this.onSpecialKey('ctrl+l');
            break;
            
          case 0x1B: // Escape
            if (this.state.showingSuggestions) {
              this.hideSuggestions();
            } else {
              await this.onSpecialKey('escape');
            }
            break;
            
          case 0x0D: // Enter
            await this.handleEnter();
            break;
            
          case 0x08: // Backspace
          case 0x7F: // Delete
            this.handleBackspace();
            break;
            
          case 0x09: // Tab
            if (process.stdin.isRaw) {
              const shift = key.toString('hex') === '5b5a';
              if (shift) {
                await this.onSpecialKey('shift+tab');
              } else {
                this.handleTab();
              }
            }
            break;
            
          case 0x01: // Ctrl+A (start of line)
            this.moveCursorToStart();
            break;
            
          case 0x05: // Ctrl+E (end of line)
            this.moveCursorToEnd();
            break;
            
          case 0x0B: // Ctrl+K (delete to end)
            this.deleteToEnd();
            break;
            
          case 0x15: // Ctrl+U (delete to start)
            this.deleteToStart();
            break;
            
          case 0x17: // Ctrl+W (delete word)
            this.deleteWord();
            break;
            
          default:
            // Regular character input
            if (code >= 0x20 && code < 0x7F) {
              this.insertChar(char);
            }
        }
      } else {
        // Handle ANSI escape sequences (arrows, etc.)
        if (char.startsWith('\x1B[') || char.startsWith('\x1BOH')) {
          await this.handleEscapeSequence(char);
        } else if (char === '\x1B\x09') {
          // Shift+Tab
          await this.onSpecialKey('shift+tab');
        } else if (code >= 0x20) {
          // Multi-byte character (UTF-8)
          this.insertChar(char);
        }
      }
      
      // Update renderer
      this.renderer.updateInput(this.state.value, this.state.cursorPosition);
    });
  }

  private async handleEscapeSequence(seq: string): Promise<void> {
    switch (seq) {
      case '\x1B[A': // Up arrow
        if (this.state.showingSuggestions) {
          this.renderer.selectPreviousSuggestion();
        } else {
          this.navigateHistory(-1);
        }
        break;
        
      case '\x1B[B': // Down arrow
        if (this.state.showingSuggestions) {
          this.renderer.selectNextSuggestion();
        } else {
          this.navigateHistory(1);
        }
        break;
        
      case '\x1B[C': // Right arrow
        this.moveCursor(1);
        break;
        
      case '\x1B[D': // Left arrow
        this.moveCursor(-1);
        break;
        
      case '\x1B[1;5C': // Ctrl+Right (word forward)
        this.moveCursorWordForward();
        break;
        
      case '\x1B[1;5D': // Ctrl+Left (word backward)
        this.moveCursorWordBackward();
        break;
        
      case '\x1BOH': // Home
      case '\x1B[H':
        this.moveCursorToStart();
        break;
        
      case '\x1BOF': // End
      case '\x1B[F':
        this.moveCursorToEnd();
        break;
    }
  }

  private insertChar(char: string): void {
    const before = this.state.value.substring(0, this.state.cursorPosition);
    const after = this.state.value.substring(this.state.cursorPosition);
    this.state.value = before + char + after;
    this.state.cursorPosition += char.length;
    
    // Check for command suggestions
    if (this.state.value.startsWith('/') && this.commandProcessor) {
      this.updateCommandSuggestions();
    } else if (this.state.showingSuggestions) {
      this.hideSuggestions();
    }
  }

  private handleBackspace(): void {
    if (this.state.cursorPosition > 0) {
      const before = this.state.value.substring(0, this.state.cursorPosition - 1);
      const after = this.state.value.substring(this.state.cursorPosition);
      this.state.value = before + after;
      this.state.cursorPosition--;
      
      // Update suggestions if typing a command
      if (this.state.value.startsWith('/')) {
        this.updateCommandSuggestions();
      }
    }
  }

  private async handleEnter(): Promise<void> {
    // Handle suggestion selection
    if (this.state.showingSuggestions) {
      const selected = this.renderer.getCurrentSuggestion();
      if (selected) {
        this.state.value = selected;
        this.state.cursorPosition = selected.length;
        this.hideSuggestions();
        return;
      }
    }
    
    // Check for multiline input (Shift+Enter would be handled differently)
    const lines = this.state.value.split('\n');
    const lastLine = lines[lines.length - 1];
    
    // Check if we should continue multiline (e.g., unclosed quotes, brackets)
    if (this.shouldContinueMultiline(this.state.value)) {
      this.state.value += '\n';
      this.state.cursorPosition = this.state.value.length;
      this.state.isMultiline = true;
      return;
    }
    
    // Process input
    const input = this.state.value.trim();
    if (input) {
      // Add to history
      this.state.history.push(input);
      if (this.state.history.length > 100) {
        this.state.history.shift();
      }
      
      // Reset state
      this.state.value = '';
      this.state.cursorPosition = 0;
      this.state.historyIndex = -1;
      this.state.isMultiline = false;
      
      // Process input
      await this.onInput(input);
    }
  }

  private shouldContinueMultiline(input: string): boolean {
    // Check for unclosed quotes
    const singleQuotes = (input.match(/'/g) || []).length;
    const doubleQuotes = (input.match(/"/g) || []).length;
    const backticks = (input.match(/`/g) || []).length;
    
    if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0) {
      return true;
    }
    
    // Check for unclosed brackets
    const openBrackets = (input.match(/[\[{(]/g) || []).length;
    const closeBrackets = (input.match(/[\]})]</g) || []).length;
    
    return openBrackets > closeBrackets;
  }

  private handleTab(): void {
    if (this.state.showingSuggestions) {
      // Accept current suggestion
      const selected = this.renderer.getCurrentSuggestion();
      if (selected) {
        this.state.value = selected;
        this.state.cursorPosition = selected.length;
        this.hideSuggestions();
      }
    } else if (this.state.value.startsWith('/')) {
      // Show command suggestions
      this.updateCommandSuggestions();
    }
  }

  private updateCommandSuggestions(): void {
    if (!this.commandProcessor) return;
    
    const input = this.state.value.substring(1); // Remove '/'
    const suggestions = this.commandProcessor.getSuggestions(input);
    
    if (suggestions.length > 0) {
      this.state.commandSuggestions = suggestions.map(s => `/${s}`);
      this.state.showingSuggestions = true;
      this.renderer.showCommandSuggestions(this.state.commandSuggestions);
    } else {
      this.hideSuggestions();
    }
  }

  private hideSuggestions(): void {
    this.state.showingSuggestions = false;
    this.renderer.hideCommandSuggestions();
  }

  private navigateHistory(direction: number): void {
    if (direction === -1 && this.state.historyIndex < this.state.history.length - 1) {
      // Going back in history
      this.state.historyIndex++;
      const index = this.state.history.length - 1 - this.state.historyIndex;
      this.state.value = this.state.history[index];
      this.state.cursorPosition = this.state.value.length;
    } else if (direction === 1 && this.state.historyIndex > -1) {
      // Going forward in history
      this.state.historyIndex--;
      if (this.state.historyIndex === -1) {
        this.state.value = '';
      } else {
        const index = this.state.history.length - 1 - this.state.historyIndex;
        this.state.value = this.state.history[index];
      }
      this.state.cursorPosition = this.state.value.length;
    }
  }

  private moveCursor(delta: number): void {
    const newPos = this.state.cursorPosition + delta;
    if (newPos >= 0 && newPos <= this.state.value.length) {
      this.state.cursorPosition = newPos;
    }
  }

  private moveCursorToStart(): void {
    const lines = this.state.value.substring(0, this.state.cursorPosition).split('\n');
    const currentLine = lines[lines.length - 1];
    this.state.cursorPosition -= currentLine.length;
  }

  private moveCursorToEnd(): void {
    const afterCursor = this.state.value.substring(this.state.cursorPosition);
    const nextNewline = afterCursor.indexOf('\n');
    if (nextNewline === -1) {
      this.state.cursorPosition = this.state.value.length;
    } else {
      this.state.cursorPosition += nextNewline;
    }
  }

  private moveCursorWordForward(): void {
    const after = this.state.value.substring(this.state.cursorPosition);
    const match = after.match(/^\s*\S+/);
    if (match) {
      this.state.cursorPosition += match[0].length;
    } else {
      this.state.cursorPosition = this.state.value.length;
    }
  }

  private moveCursorWordBackward(): void {
    const before = this.state.value.substring(0, this.state.cursorPosition);
    const match = before.match(/\S+\s*$/);
    if (match) {
      this.state.cursorPosition -= match[0].length;
    } else {
      this.state.cursorPosition = 0;
    }
  }

  private deleteToEnd(): void {
    const lines = this.state.value.split('\n');
    const beforeCursor = this.state.value.substring(0, this.state.cursorPosition);
    const beforeLines = beforeCursor.split('\n');
    const lineIndex = beforeLines.length - 1;
    
    if (lineIndex < lines.length) {
      lines[lineIndex] = beforeLines[lineIndex];
      this.state.value = lines.slice(0, lineIndex + 1).join('\n');
    }
  }

  private deleteToStart(): void {
    const afterCursor = this.state.value.substring(this.state.cursorPosition);
    const lines = this.state.value.split('\n');
    const beforeCursor = this.state.value.substring(0, this.state.cursorPosition);
    const beforeLines = beforeCursor.split('\n');
    const lineIndex = beforeLines.length - 1;
    
    if (lineIndex < lines.length) {
      const lineStart = beforeCursor.lastIndexOf('\n') + 1;
      this.state.value = this.state.value.substring(0, lineStart) + afterCursor;
      this.state.cursorPosition = lineStart;
    }
  }

  private deleteWord(): void {
    if (this.state.cursorPosition === 0) return;
    
    const before = this.state.value.substring(0, this.state.cursorPosition);
    const match = before.match(/\S+\s*$/);
    
    if (match) {
      const deleteLength = match[0].length;
      this.state.value = 
        before.substring(0, before.length - deleteLength) +
        this.state.value.substring(this.state.cursorPosition);
      this.state.cursorPosition -= deleteLength;
    }
  }

  public start(): void {
    this.isActive = true;
    
    // Configure terminal
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
  }

  public stop(): void {
    this.isActive = false;
    
    // Restore terminal
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    
    this.rl.close();
  }

  public getHistory(): string[] {
    return [...this.state.history];
  }

  public clearHistory(): void {
    this.state.history = [];
    this.state.historyIndex = -1;
  }
}