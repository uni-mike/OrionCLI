# Orion CLI - Complete Setup & Configuration Guide

## Overview
Orion is a custom Azure OpenAI CLI built from the ground up, replacing the flickering grok-cli with a clean, beautiful terminal interface.

## What We Built

### Key Features
- **No Flickering**: Direct terminal streaming without React/Ink UI frameworks
- **Beautiful Interface**: Clean box borders, colored output, model icons
- **Multiple Azure Models**: GPT-5 family, O3, O4-Mini, GPT-4o
- **Task-Based Routing**: Automatic model selection based on task type
- **Dual Mode**: Interactive chat and headless single-prompt execution

### Architecture Decision
We started with the open-source grok-cli but encountered severe flickering issues due to its Ink (React for terminals) rendering. After multiple attempts to fix it within the framework, we created a completely new implementation using direct Node.js readline and stdout streaming.

## Azure OpenAI Configuration

### Models & Endpoints

| Model | Endpoint | API Key | Purpose |
|-------|----------|---------|---------|
| **GPT-5** | `mike-mazsz1c6-eastus2.openai.azure.com` | Default Key* | Complex coding & reasoning |
| **GPT-5-Chat** | `mike-mazsz1c6-eastus2.openai.azure.com` | Default Key* | Conversational AI (default) |
| **GPT-5-Mini** | `mike-mazsz1c6-eastus2.openai.azure.com` | Default Key* | Fast responses |
| **O4-Mini** | `mike-mazsz1c6-eastus2.openai.azure.com` | Default Key* | Ultra-fast simple queries |
| **O3** | `unipathai7556217047.openai.azure.com` | O3 Key** | Advanced reasoning & planning |
| **GPT-4o** | `unipathai7556217047.openai.azure.com` | O3 Key** | Multimodal (vision + text) |

*Default Key: `<YOUR_DEFAULT_AZURE_KEY>`
**O3 Key: `<YOUR_O3_AZURE_KEY>`

### Task Mapping
```bash
coding     → GPT-5
reasoning  → O3
planning   → O3
chat       → GPT-5-Chat
fast       → O4-Mini
multimodal → GPT-4o
```

## Technical Implementation

### Core Components

1. **orion** - Bash wrapper script
   - Handles model/task selection
   - Sets appropriate Azure endpoints & API keys
   - Launches Node.js CLI

2. **orion-cli.ts** - TypeScript implementation
   - Direct OpenAI SDK integration
   - No UI frameworks (no Ink/React)
   - Stream directly to stdout
   - Buffered output for smooth rendering

### Key Fixes Applied

1. **Temperature Issue**: Azure models don't support custom temperature
   - Solution: Don't set temperature parameter for Azure deployments
   - Let Azure use default values

2. **Token Limit Parameter**: Different parameter names
   - Azure uses: `max_completion_tokens`
   - Standard OpenAI uses: `max_tokens`

3. **Authentication**: Different models need different keys
   - O3 and GPT-4o use a separate subscription key
   - Other models use the default key

## Installation & Usage

### Setup
```bash
cd /Users/mike.admon/UNIPATH_PROJECT/OrionCLI
npm install
npm run build
```

### Interactive Mode
```bash
./orion                  # Default GPT-5-Chat
./orion gpt-5           # Specific model
./orion coding          # Task-based (uses GPT-5)
./orion reasoning       # Task-based (uses O3)
```

### Headless Mode
```bash
./orion --prompt "Your question"
./orion coding --prompt "Write a function"
```

### Commands
- `clear` - Reset conversation
- `help` - Show commands
- `exit` - Quit

## Development History

### Evolution Path
1. **Original grok-cli**: Flickering issues due to Ink/React
2. **Multiple attempts**: Created 10+ versions trying to fix flickering
3. **Final solution**: Complete rewrite without UI frameworks
4. **Renamed to Orion**: Clean slate with focused functionality

### Files Removed
- All experimental versions (simple.ts, beautiful.ts, claude-style.ts, etc.)
- Original grok-cli Ink components
- Test files and redundant wrappers

### Clean Structure
```
OrionCLI/
├── orion           # Main wrapper
├── orion-cli.ts    # Source
├── orion-cli.js    # Compiled
├── package.json    # Dependencies
├── README.md       # User guide
├── SETUP.md        # This file
├── .gitignore      # Git configuration
├── src-original/   # Original grok-cli source (preserved for tools)
└── dist-original/  # Original compiled code
```

### Preserved Original Code
The `src-original` and `dist-original` directories contain the complete grok-cli source with:
- File operations (read, write, edit)
- Bash command execution
- Search and replace tools
- Diff rendering and edit acceptance
- MCP server integration

These are preserved for future integration of advanced features while maintaining our non-flickering implementation.

## Future Enhancements

### Potential Features
- File operations (read/write/edit)
- Bash command execution
- Tool integration (like Claude's capabilities)
- Conversation persistence
- Model switching mid-conversation

### Architecture Notes
- Keep it simple - no complex UI frameworks
- Direct streaming is key to preventing flicker
- Minimal dependencies for maintainability

## Git Repository

### Initial Setup Complete
```bash
git init
git add .
git commit -m "Initial Orion CLI implementation"
```

### Ready for Remote
```bash
git remote add origin [your-github-url]
git push -u origin master
```

## Session Continuity

For next Claude session, provide:
1. This repository path: `/Users/mike.admon/UNIPATH_PROJECT/OrionCLI`
2. Key requirement: No flickering, beautiful CLI
3. Current state: Working implementation with all Azure models

---

**Orion CLI v1.0** - Built with focus on performance and aesthetics
*No more flickering, just smooth AI interactions* ✨