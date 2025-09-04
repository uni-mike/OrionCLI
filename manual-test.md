# Manual Test Guide for OrionCLI

## Test Commands

### Simple Tests
1. `create a shopping list with 5 items`
2. `what time is it?`
3. `list files in current directory`

### Medium Tests
1. `create a diagram`
2. `read package.json`
3. `show git status`

### Complex Tests
1. `read package.json and create a summary`
2. `create hello.txt, read it, then append world`
3. `analyze all .js files and create a report`

## What to Check

✅ **Working:**
- Files are created successfully
- Tool output is shown (`⚙ Tool: ✅ File created...`)
- AI responds with confirmation

⚠️ **Known Issues:**
- "Processing..." spinner may persist after completion
- Need to press Enter to clear the spinner
- This is a visual bug only - the process completes successfully

## How to Exit
- Press `Ctrl+C` to exit OrionCLI