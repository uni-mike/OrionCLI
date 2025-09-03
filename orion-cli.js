#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline = __importStar(require("readline"));
const openai_1 = __importDefault(require("openai"));
const chalk_1 = __importDefault(require("chalk"));
class OrionCLI {
    constructor() {
        this.messages = [];
        this.modelInfo = {
            'gpt-5-chat': '💬 GPT-5 Chat',
            'gpt-5': '🚀 GPT-5',
            'gpt-5-mini': '⚡ GPT-5 Mini',
            'gpt-4o': '🎨 GPT-4 Omni',
            'o3': '🧠 O3',
            'o4-mini': '💨 O4 Mini'
        };
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_KEY;
        this.deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-chat';
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
        if (!endpoint || !apiKey) {
            console.error(chalk_1.default.red('❌ Missing Azure OpenAI configuration'));
            process.exit(1);
        }
        this.client = new openai_1.default({
            apiKey: apiKey,
            baseURL: `${endpoint}/openai/deployments/${this.deployment}`,
            defaultQuery: { 'api-version': apiVersion },
            defaultHeaders: { 'api-key': apiKey }
        });
        this.messages.push({
            role: 'system',
            content: 'You are Orion, a helpful AI assistant. Be concise and direct. Format code in markdown blocks.'
        });
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.rl.on('SIGINT', () => {
            this.exitGracefully();
        });
    }
    exitGracefully() {
        console.log(chalk_1.default.yellow('\n\n👋 Goodbye from Orion!\n'));
        process.exit(0);
    }
    printHeader() {
        console.clear();
        const modelDisplay = this.modelInfo[this.deployment] || `🤖 ${this.deployment}`;
        console.log(chalk_1.default.cyan('╭────────────────────────────────────────╮'));
        console.log(chalk_1.default.cyan('│') + chalk_1.default.white.bold('         ORION AI Assistant'.padEnd(39)) + chalk_1.default.cyan('│'));
        console.log(chalk_1.default.cyan('├────────────────────────────────────────┤'));
        console.log(chalk_1.default.cyan('│') + chalk_1.default.yellow(`  ${modelDisplay}`.padEnd(39)) + chalk_1.default.cyan('│'));
        console.log(chalk_1.default.cyan('╰────────────────────────────────────────╯'));
        console.log(chalk_1.default.gray('\n  Commands: clear, exit, help\n'));
    }
    async streamResponse(prompt) {
        this.messages.push({ role: 'user', content: prompt });
        console.log(chalk_1.default.blue.bold('Human: ') + chalk_1.default.white(prompt));
        console.log();
        process.stdout.write(chalk_1.default.green.bold('Orion: '));
        try {
            const stream = await this.client.chat.completions.create({
                model: this.deployment,
                messages: this.messages,
                stream: true,
                max_completion_tokens: 4000
            });
            let fullResponse = '';
            let buffer = '';
            for await (const chunk of stream) {
                const content = chunk.choices?.[0]?.delta?.content || '';
                if (content) {
                    buffer += content;
                    if (buffer.includes('\n') || buffer.length > 50) {
                        process.stdout.write(buffer);
                        fullResponse += buffer;
                        buffer = '';
                    }
                }
            }
            if (buffer) {
                process.stdout.write(buffer);
                fullResponse += buffer;
            }
            console.log('\n');
            console.log(chalk_1.default.gray('─'.repeat(40)));
            console.log();
            this.messages.push({ role: 'assistant', content: fullResponse });
        }
        catch (error) {
            console.error(chalk_1.default.red(`\n❌ Error: ${error.message}\n`));
        }
    }
    async runInteractive() {
        this.printHeader();
        const askQuestion = () => {
            this.rl.question(chalk_1.default.cyan('▶ '), async (input) => {
                const trimmed = input.trim();
                if (!trimmed) {
                    askQuestion();
                    return;
                }
                switch (trimmed.toLowerCase()) {
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
                        console.log(chalk_1.default.cyan('\nOrion Commands:'));
                        console.log(chalk_1.default.white('  clear  - Reset conversation'));
                        console.log(chalk_1.default.white('  exit   - Quit Orion'));
                        console.log(chalk_1.default.white('  help   - Show this help\n'));
                        askQuestion();
                        return;
                }
                console.log();
                await this.streamResponse(trimmed);
                askQuestion();
            });
        };
        askQuestion();
    }
    async runHeadless(prompt) {
        process.stdout.write(chalk_1.default.green.bold('Orion: '));
        try {
            const stream = await this.client.chat.completions.create({
                model: this.deployment,
                messages: [
                    { role: 'system', content: 'You are Orion, a helpful AI assistant.' },
                    { role: 'user', content: prompt }
                ],
                stream: true,
                max_completion_tokens: 4000
            });
            for await (const chunk of stream) {
                const content = chunk.choices?.[0]?.delta?.content || '';
                if (content)
                    process.stdout.write(content);
            }
            console.log();
        }
        catch (error) {
            console.error(chalk_1.default.red(`Error: ${error.message}`));
        }
        process.exit(0);
    }
}
// Main
const args = process.argv.slice(2);
const promptIdx = args.findIndex(a => a === '--prompt' || a === '-p');
const cli = new OrionCLI();
if (promptIdx !== -1 && args[promptIdx + 1]) {
    cli.runHeadless(args[promptIdx + 1]);
}
else {
    cli.runInteractive();
}
