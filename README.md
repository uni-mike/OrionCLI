# OrionCLI - Enhanced Azure OpenAI Assistant

A beautiful, intelligent command-line interface for Azure OpenAI models with smart task routing, modular tool system, and comprehensive features.

## ✨ Features

- 🧠 **Intelligent Model Routing**: Auto-selects optimal model based on task analysis
- 🎨 **Beautiful UI**: Stunning ASCII art, vibrant colors, flicker-free interface
- ⚡ **6 AI Models**: GPT-5, GPT-5-Chat, GPT-5-Mini, O3, O4-Mini, GPT-4o
- 🔧 **Modular Tool System**: 8 tool categories with 43+ specialized tools
- 📊 **Smart Status Display**: Comprehensive context awareness
- 💫 **Professional Experience**: Input at bottom, messages scroll above
- 🚀 **AI-First Approach**: Let AI combine basic tools for complex tasks

## 🆕 Latest Updates (v2.1.0)

### Modular Tool Architecture
- **8 Focused Tool Categories**: Streamlined from initial design
- **43 Essential Tools**: Practical, frequently-used operations
- **Smart Tool Registry**: Centralized management and discovery
- **Robust Error Handling**: Fixed null/undefined edge cases

### Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| **File Tools** | 4 | Read, write, edit, list files |
| **Git Tools** | 8 | Status, commit, push, branch management |
| **System Tools** | 6 | Process, memory, disk, network info |
| **SSH Tools** | 4 | Remote connections, file transfers |
| **Docker Tools** | 7 | Container and image management |
| **Database Tools** | 4 | Query, backup, restore, schema |
| **Conversion Tools** | 6 | Base64, hash, JSON, text formatting |
| **Web Search Tools** | 4 | Programming, security, documentation search |

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
node orion.js
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

### 🔧 Modular Tool System
The tool system follows an **AI-first philosophy**:
- Core tools handle basic operations
- AI intelligently combines tools for complex tasks
- No over-engineered enterprise features
- Focus on practical, everyday developer needs

### 📊 Status Display
- **Auto-edit toggle**: Prominently displayed under input
- **Active file context**: Shows current working file
- **Session info**: Timer, command count, current directory
- **Model indicator**: Current model with icon and color
- **Tool execution**: Clean, minimal output with emojis

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
node orion.js
```

## 📁 Project Structure

```
OrionCLI/
├── orion.js         # Main enhanced CLI (use this!)
├── src/             
│   ├── tools/       # Modular tool implementations
│   │   ├── orion-tool-registry.js  # Central registry
│   │   ├── file-tools.js           # File operations
│   │   ├── git-tools.js            # Git operations
│   │   ├── system-tools.js         # System monitoring
│   │   ├── ssh-tools.js            # SSH operations
│   │   ├── docker-tools.js         # Docker management
│   │   ├── database-tools.js       # Database operations
│   │   ├── conversion-tools.js     # Data conversions
│   │   └── web-search-tools.js     # Enhanced web search
│   └── ...          # TypeScript source (legacy)
├── package.json     # Dependencies
├── .env             # API keys (create this)
├── _ARCHIVE/        # Archived old versions
└── README.md        # This file
```

## 🔧 Technical Architecture

### Core Design Principles
- **Simplicity**: Focus on essential features, avoid bloat
- **Modularity**: Clean separation of concerns
- **AI-First**: Let AI orchestrate tool combinations
- **Reliability**: Robust error handling and edge cases

### Implementation Details
- **Framework**: Node.js with enhanced terminal UI libraries
- **AI Integration**: Azure OpenAI with 6 model deployments
- **Smart Routing**: ML-based task classification system
- **UI**: Flicker-free terminal with boxen, gradient-string, figlet
- **Tool System**: Modular architecture with centralized registry
- **Error Handling**: Comprehensive null/undefined protection

## 📋 TODO & Status

### ✅ Completed
- [x] Intelligent model routing based on task type
- [x] Beautiful ASCII art and gradient effects
- [x] Flicker-free rendering with optimized updates
- [x] Smart task classification system
- [x] Modular tool architecture implementation
- [x] 8 tool categories with 43+ tools
- [x] Centralized tool registry
- [x] Enhanced web search for programming/security
- [x] Robust null/undefined handling
- [x] Streamlined architecture (removed over-engineered features)

### 🚧 In Progress
- [ ] Tool execution feedback improvements
- [ ] Advanced tool composition patterns
- [ ] Performance optimization for large operations

### 📝 Planned
- [ ] Tool usage analytics
- [ ] Custom tool plugin system
- [ ] Tool execution history
- [ ] Batch operation support
- [ ] Tool configuration presets

## 🏗️ Development Philosophy

The codebase follows these principles:
- **Quality over Quantity**: ~15-20 well-implemented tools > 70+ rarely used ones
- **AI Intelligence**: Let AI combine simple tools creatively
- **User Experience**: Clean, minimal output without overwhelming details
- **Maintainability**: Modular design for easy updates and debugging
- **Pragmatism**: Focus on real developer needs, not enterprise theater

## 🔒 Security Note

- Keep `.gitignore` simple to avoid data loss
- Never commit API keys or sensitive data
- Tool execution is sandboxed within Node.js environment
- File operations require explicit user input

---
**OrionCLI** - *Where AI meets beautiful terminal experiences* ✨🚀

Built with love by Mike Admon