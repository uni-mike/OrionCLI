# OrionCLI - Enhanced Azure OpenAI Assistant

A beautiful, intelligent command-line interface for Azure OpenAI models with smart task routing and comprehensive features.

## ✨ Features

- 🧠 **Intelligent Model Routing**: Auto-selects optimal model based on task analysis
- 🎨 **Beautiful UI**: Stunning ASCII art, vibrant colors, flicker-free interface
- ⚡ **6 AI Models**: GPT-5, GPT-5-Chat, GPT-5-Mini, O3, O4-Mini, GPT-4o
- 📊 **Smart Status Display**: Comprehensive context awareness
- 🔧 **Advanced Tools**: Integrated tool system with MCP support
- 💫 **Professional Experience**: Input at bottom, messages scroll above

## Available Models

| Model | Icon | Description | Best For |
|-------|------|-------------|----------|
| GPT-5-Chat | 💬 | Conversational AI | General chat, Q&A |
| GPT-5 | 🚀 | Advanced reasoning | Complex coding, analysis |
| GPT-5-Mini | ⚡ | Fast responses | Quick tasks |
| O3 | 🧠 | Deep reasoning | Planning, architecture |
| O4-Mini | 💨 | Ultra fast | Simple queries |
| GPT-4o | 🎨 | Multimodal | Vision + text tasks |

## 🚀 Quick Start

```bash
node orion-pro.js
```

**That's it!** OrionCLI will launch with the beautiful interface and intelligent features.

## 💫 Smart Features

### 🧠 Intelligent Model Selection
OrionCLI automatically analyzes your input and selects the optimal model:

- **Coding tasks** → GPT-5 (functions, debugging, syntax)
- **Complex reasoning** → O3 (analysis, planning, architecture) 
- **Quick questions** → O4-Mini (fast responses, simple queries)
- **Visual content** → GPT-4o (images, diagrams, screenshots)
- **Creative writing** → GPT-5-Chat (stories, essays, brainstorming)
- **Technical docs** → GPT-5 (documentation, explanations)

### 📊 Status Display
- **Auto-edit toggle**: Prominently displayed under input
- **Active file context**: Shows current working file
- **Session info**: Timer, command count, current directory
- **Model indicator**: Current model with icon and color

## 🎮 Commands

| Command | Description |
|---------|-------------|
| `/help` | Show all available commands |
| `/smart` | Display smart features info |
| `/models` | List all available AI models |
| `/model <name>` | Switch to specific model |
| `/file <path>` | Set active file for context |
| `/auto` | Toggle auto-edit mode |
| `/tools` | Show available tools |
| `/clear` | Clear chat history |
| `/exit` | Exit OrionCLI |

## ⚙️ Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure API keys** in `.env`:
```bash
ORION_DEFAULT_KEY=your_azure_openai_key
ORION_O3_KEY=your_o3_endpoint_key
AZURE_OPENAI_API_VERSION=2024-12-01-preview
```

3. **Run OrionCLI**:
```bash
node orion-pro.js
```

## 📁 Project Structure

```
OrionCLI/
├── orion-pro.js     # Main enhanced CLI (use this!)
├── src/             # TypeScript source code
├── package.json     # Dependencies
├── .env             # API keys (create this)
├── _ARCHIVE/        # Archived old versions
└── README.md        # This file
```

## 🔧 Technical Details

- **Framework**: Node.js with enhanced terminal UI libraries
- **AI Integration**: Azure OpenAI with 6 model deployments
- **Smart Routing**: ML-based task classification system
- **UI**: Flicker-free terminal with boxen, gradient-string, figlet
- **Architecture**: Preserved all grok-cli features with enhancements

## 🏗️ Development

The codebase includes both JavaScript (current) and TypeScript (legacy) versions:
- Use `orion-pro.js` for the enhanced experience
- TypeScript source in `src/` maintained for future development
- Archived versions in `_ARCHIVE/` for reference

---
**OrionCLI** - *Where AI meets beautiful terminal experiences* ✨🚀