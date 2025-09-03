#!/usr/bin/env node

import * as readline from 'readline';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class BeautifulDirectCLI {
  private client: OpenAI;
  private rl: readline.Interface;
  private messages: Message[] = [];
  private deployment: string;
  private modelInfo: { [key: string]: string } = {
    'gpt-5-chat': '💬 GPT-5 Chat',
    'gpt-5': '🚀 GPT-5',
    'gpt-5-mini': '⚡ GPT-5 Mini',
    'gpt-4o': '🎨 GPT-4 Omni',
    'o3': '🧠 O3',
    'o4-mini': '💨 O4 Mini'
  };
  
  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_KEY;
    this.deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-chat';
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
    
    if (!endpoint || !apiKey) {
      console.error(chalk.red('❌ Missing Azure OpenAI configuration'));
      process.exit(1);
    }
    
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: `${endpoint}/openai/deployments/${this.deployment}`,
      defaultQuery: { 'api-version': apiVersion },
      defaultHeaders: { 'api-key': apiKey }
    });
    
    this.messages.push({
      role: 'system',
      content: 'You are a helpful AI assistant. Be concise and direct. Format code in markdown blocks.'
    });
    
    // Create readline with custom prompt
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Handle Ctrl+C gracefully
    this.rl.on('SIGINT', () => {
      this.exitGracefully();
    });
  }
  
  private exitGracefully(): void {
    console.log(chalk.yellow('\n\n👋 Goodbye!\n'));
    process.exit(0);
  }
  
  private printHeader(): void {
    console.clear();
    const modelDisplay = this.modelInfo[this.deployment] || `🤖 ${this.deployment}`;
    
    console.log(chalk.cyan('╭────────────────────────────────────────╮'));
    console.log(chalk.cyan('│') + chalk.white.bold('  Azure OpenAI Assistant'.padEnd(39)) + chalk.cyan('│'));
    console.log(chalk.cyan('├────────────────────────────────────────┤'));
    console.log(chalk.cyan('│') + chalk.yellow(`  ${modelDisplay}`.padEnd(39)) + chalk.cyan('│'));
    console.log(chalk.cyan('╰────────────────────────────────────────╯'));
    console.log(chalk.gray('\n  Commands: clear, exit\n'));
  }
  
  private formatCodeBlocks(text: string): string {
    // Replace markdown code blocks with colored output
    return text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const langLabel = lang ? chalk.dim(`[${lang}]`) : '';
      const border = chalk.dim('─'.repeat(40));
      return `\n${border} ${langLabel}\n${chalk.yellow(code.trim())}\n${border}`;
    });
  }
  
  private async streamResponse(prompt: string): Promise<void> {
    this.messages.push({ role: 'user', content: prompt });
    
    // Show user message with nice formatting
    console.log(chalk.blue.bold('Human: ') + chalk.white(prompt));
    console.log();
    
    // Show assistant label
    process.stdout.write(chalk.green.bold('Assistant: '));
    
    try {
      const stream = await this.client.chat.completions.create({
        model: this.deployment,
        messages: this.messages as any,
        stream: true,
        max_completion_tokens: 4000
      });
      
      let fullResponse = '';
      let buffer = '';
      
      for await (const chunk of stream as any) {
        const content = chunk.choices?.[0]?.delta?.content || '';
        if (content) {
          // Buffer for smoother output
          buffer += content;
          
          // Flush buffer on newlines or when it gets large
          if (buffer.includes('\n') || buffer.length > 50) {
            process.stdout.write(buffer);
            fullResponse += buffer;
            buffer = '';
          }
        }
      }
      
      // Flush remaining buffer
      if (buffer) {
        process.stdout.write(buffer);
        fullResponse += buffer;
      }
      
      // Add spacing and separator
      console.log('\n');
      console.log(chalk.gray('─'.repeat(40)));
      console.log();
      
      this.messages.push({ role: 'assistant', content: fullResponse });
      
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    }
  }
  
  async runInteractive(): Promise<void> {
    this.printHeader();
    
    const askQuestion = () => {
      // Custom formatted prompt
      this.rl.question(chalk.cyan('▶ '), async (input) => {
        const trimmed = input.trim();
        
        if (!trimmed) {
          askQuestion();
          return;
        }
        
        // Handle commands
        switch(trimmed.toLowerCase()) {
          case 'exit':
          case 'quit':
          case 'q':
            this.exitGracefully();
            break;
            
          case 'clear':
          case 'cls':
            this.messages = [this.messages[0]];
            this.printHeader();
            askQuestion();
            return;
            
          case 'help':
          case '?':
            console.log(chalk.cyan('\nCommands:'));
            console.log(chalk.white('  clear  - Reset conversation'));
            console.log(chalk.white('  exit   - Quit the assistant'));
            console.log(chalk.white('  help   - Show this help\n'));
            askQuestion();
            return;
        }
        
        console.log(); // Add spacing before processing
        await this.streamResponse(trimmed);
        askQuestion();
      });
    };
    
    askQuestion();
  }
  
  async runHeadless(prompt: string): Promise<void> {
    process.stdout.write(chalk.green.bold('Assistant: '));
    
    try {
      const stream = await this.client.chat.completions.create({
        model: this.deployment,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'user', content: prompt }
        ] as any,
        stream: true,
        max_completion_tokens: 4000
      });
      
      for await (const chunk of stream as any) {
        const content = chunk.choices?.[0]?.delta?.content || '';
        if (content) process.stdout.write(content);
      }
      
      console.log();
      
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    
    process.exit(0);
  }
}

// Main
const args = process.argv.slice(2);
const promptIdx = args.findIndex(a => a === '--prompt' || a === '-p');

const cli = new BeautifulDirectCLI();

if (promptIdx !== -1 && args[promptIdx + 1]) {
  cli.runHeadless(args[promptIdx + 1]);
} else {
  cli.runInteractive();
}