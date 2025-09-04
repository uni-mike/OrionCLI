#!/usr/bin/env node

// Test the system prompt generation
const path = require('path');

// Load only the necessary parts
const OrionToolRegistry = require('./src/tools/orion-tool-registry');
const TaskUnderstanding = require('./src/intelligence/task-understanding');

async function testSystemPrompt() {
  console.log('Testing System Prompt Generation...\n');
  
  const toolRegistry = new OrionToolRegistry();
  const taskUnderstanding = new TaskUnderstanding();
  
  const input = "create a test.txt file with 'Hello World'";
  const taskInfo = await taskUnderstanding.analyzeTask(input);
  
  console.log('Task Analysis:');
  console.log('  Type:', taskInfo.type);
  console.log('  Needs Tools:', taskInfo.needsTools);
  console.log('  Tools:', taskInfo.tools);
  console.log('  Priority:', taskInfo.priority);
  
  // Get tool definitions
  if (taskInfo.needsTools) {
    const toolDefs = toolRegistry.getToolDefinitions(taskInfo.tools);
    console.log('\nTool Definitions:');
    toolDefs.forEach(tool => {
      console.log(`  - ${tool.function.name}: ${tool.function.description}`);
    });
  }
  
  // Build a minimal system prompt like OrionCLI does
  const systemPrompt = `You are OrionCLI, an advanced AI assistant.

PRIME DIRECTIVE: BE DECISIVE
When asked to create files, modify code, or perform any action - DO IT IMMEDIATELY.
Do not ask for clarification. Make intelligent defaults. Take action.

MANDATORY: Output tool calls as JSON in the exact format below.

Tool Formats:
{"tool": "write_file", "filename": "example.txt", "content": "file contents here"}

When you need to execute a tool:
1. Decide what action to take
2. Output the JSON for that tool
3. You can include explanation text, but the JSON must be complete and valid

Example response for "create a hello.txt file":
I'll create the hello.txt file for you.
{"tool": "write_file", "filename": "hello.txt", "content": "Hello, World!"}`;

  console.log('\n' + '='.repeat(80));
  console.log('System Prompt:');
  console.log('='.repeat(80));
  console.log(systemPrompt);
  console.log('='.repeat(80));
}

testSystemPrompt().catch(console.error);