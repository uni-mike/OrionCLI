# OrionCLI Architecture

## Overview
OrionCLI is an advanced AI-powered command-line interface that integrates multiple language models with a sophisticated tool execution system.

## Core Components

### 1. Main Entry Point (`orion.js`)
- Handles CLI initialization and command parsing
- Manages interactive chat sessions
- Processes user commands and model switching

### 2. Source Code (`src/`)
- **tools/** - Tool implementations (file operations, web scraping, etc.)
- **utils/** - Utility functions and helpers
- **config/** - Configuration management
- **models/** - Model integrations and API clients
- **orchestration/** - Task orchestration and planning system

### 3. ToolForge System (`.tool-forge/`)
- Dynamic tool generation from natural language
- Sandboxed execution environment
- Tool versioning and management

### 4. Distribution (`dist/`)
- Compiled JavaScript output
- Ready-to-deploy artifacts

## Key Features

### Multi-Model Support
- GPT-5 family (default)
- GPT-4o and GPT-4o-mini
- DeepSeek-R1
- O3 advanced reasoning
- Dynamic model switching via `/model` command

### Tool System
- File operations (read, write, edit)
- Web fetching and scraping
- Command execution
- JSON/YAML parsing
- API interactions

### Orchestration
- Multi-step task planning
- Parallel tool execution
- Context management
- Error recovery

## Data Flow
1. User input → Command parser
2. Command → Model selection
3. Model → Tool invocation
4. Tool → Execution & results
5. Results → Response formatting
6. Response → User output