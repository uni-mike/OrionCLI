# ToolForge System

## Overview
ToolForge is an innovative system that automatically generates executable tools from natural language descriptions using AI.

## How It Works

### 1. Tool Request
When OrionCLI encounters a task requiring a tool that doesn't exist, it can automatically generate one:
- User describes what they need
- System analyzes the requirement
- AI generates appropriate tool code

### 2. Tool Generation
- Tools are generated as JavaScript modules
- Each tool follows a standard interface
- Generated code is sandboxed for safety

### 3. Tool Execution
- Tools run in an isolated environment
- Input/output is strictly controlled
- Results are validated before returning

## Directory Structure
```
.tool-forge/
├── manifest.json       # Tool registry and metadata
├── sandbox/           # Sandboxed execution environment
└── versions/          # Tool version history
```

## Available Tools

### Core Tools
- **File Operations**: Read, write, edit files
- **Web Tools**: Fetch URLs, scrape content
- **Data Processing**: JSON/YAML parsing, CSV handling
- **System Tools**: Command execution, environment info

### Generated Tools
Tools can be dynamically created for:
- Custom API integrations
- Data transformations
- Specialized calculations
- Domain-specific operations

## Usage

### Automatic Generation
Simply describe what you need, and ToolForge will create it:
```
"I need a tool to analyze Python code complexity"
"Create a tool that converts markdown to HTML"
```

### Manual Tool Creation
Tools can also be manually added to the `src/tools/` directory following the standard interface.

## Security
- All generated tools run in a sandboxed environment
- File system access is restricted
- Network requests are monitored
- Malicious code patterns are blocked

## Configuration
ToolForge behavior can be configured via:
- `.tool-forge/manifest.json` - Tool settings
- Environment variables - API keys and endpoints
- Runtime flags - Enable/disable features