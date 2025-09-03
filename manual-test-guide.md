# OrionCLI Manual Test Guide

## Quick Functionality Tests

### 1. Test File Reading
```
# Start OrionCLI
node orion.js

# Test commands:
"What is the README.md file about?"
"Read the TODO.md file and summarize it"
"What does test-simple.txt contain?"
```

### 2. Test File Operations
```
# Create a file
"Create a file called test-output.txt with the content 'Hello from OrionCLI'"

# Update a file  
"Add 'This is a new line' to test-output.txt"

# Check if file exists
"Does test-output.txt exist?"

# Delete a file (should ask for confirmation)
"Delete the file test-output.txt"
```

### 3. Test Search & Listing
```
# List files
"List all JavaScript files in src/tools"
"Show me all the .md files in the project"

# Search content
"Search for 'orchestration' in the codebase"
"Find files containing 'TODO'"
```

### 4. Test Git Operations
```
"What's the current git status?"
"Show me recent commits"
"What files have been modified?"
```

### 5. Test System Information
```
"Show system information"
"What's the current working directory?"
"How much disk space is available?"
```

### 6. Test Help & Commands
```
/help
/tools
/permissions
/models
```

### 7. Test Orchestration (Complex Tasks)
```
"Create a React component plan"
"Analyze the project structure and suggest improvements"
"Find and fix any TODO comments in the codebase"
```

## Expected Behaviors

✅ **Good Signs:**
- Orion reads files and provides summaries
- File operations show actual results, not JSON
- Search returns relevant matches
- Commands execute without hanging
- Multi-step tasks create todo lists
- Confirmation prompts appear for destructive actions

❌ **Issues to Watch For:**
- Showing "[object Object]" instead of results
- Displaying raw JSON instead of executing tools
- Listing files when asked to read them
- Not continuing with planned tasks
- Missing confirmation for delete operations

## Quick Smoke Test

Run this for a basic health check:
```bash
echo "What is README.md about?" | timeout 10 node orion.js
```

Should output a summary of the README file, not JSON or error messages.