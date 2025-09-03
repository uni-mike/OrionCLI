# Orion - Azure OpenAI CLI Assistant

A beautiful, non-flickering command-line interface for Azure OpenAI models.

## Features

- 🚀 **Multiple AI Models**: GPT-5, O3, O4-Mini, GPT-4o
- 🎯 **Task-Based Selection**: Automatic model choice based on task type
- ✨ **No Flickering**: Smooth streaming output
- 🎨 **Beautiful Interface**: Clean, colored terminal UI
- 💬 **Interactive & Headless**: Both modes supported

## Available Models

| Model | Icon | Description | Best For |
|-------|------|-------------|----------|
| GPT-5-Chat | 💬 | Conversational AI | General chat, Q&A |
| GPT-5 | 🚀 | Advanced reasoning | Complex coding, analysis |
| GPT-5-Mini | ⚡ | Fast responses | Quick tasks |
| O3 | 🧠 | Deep reasoning | Planning, architecture |
| O4-Mini | 💨 | Ultra fast | Simple queries |
| GPT-4o | 🎨 | Multimodal | Vision + text tasks |

## Usage

### Interactive Mode
```bash
# Default (GPT-5-Chat)
./orion

# With specific model
./orion gpt-5
./orion o3

# Task-based selection
./orion coding     # Uses GPT-5
./orion reasoning  # Uses O3
./orion fast       # Uses O4-Mini
./orion chat       # Uses GPT-5-Chat
```

### Headless Mode
```bash
./orion --prompt "Your question here"
./orion coding --prompt "Write a Python function"
./orion reasoning --prompt "Design a system architecture"
```

## Commands

In interactive mode:
- `clear` - Reset conversation
- `help` - Show available commands
- `exit` - Quit Orion

## Task Types

- **coding** → GPT-5 (Complex programming)
- **reasoning/planning** → O3 (Deep analysis)
- **chat** → GPT-5-Chat (Conversations)
- **fast** → O4-Mini (Quick responses)
- **multimodal** → GPT-4o (Images + text)

## Installation

```bash
cd /Users/mike.admon/UNIPATH_PROJECT/DevOpsTools/ORION
npm install
npm run build
./orion
```

## Architecture

```
ORION/
├── orion           # Main wrapper script
├── orion-cli.ts    # TypeScript source
├── orion-cli.js    # Compiled JavaScript
├── package.json    # Dependencies
└── README.md       # This file
```

## Technical Details

- Built with TypeScript and Node.js
- Uses OpenAI SDK for Azure OpenAI
- Direct streaming to terminal (no React/Ink)
- Minimal dependencies for clean operation

---
*Orion - Your AI assistant in the stars* ⭐