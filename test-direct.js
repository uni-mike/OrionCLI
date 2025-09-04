#!/usr/bin/env node

// Direct test of OrionCLI tool execution
const OrionCLI = require('./orion.js');

async function testDirect() {
  // Mock the OrionCLI instance
  const FileTools = require('./src/tools/file-tools');
  const JsonToolParser = require('./src/tools/json-tool-parser');
  
  // Test JSON parsing
  console.log('Testing JSON Tool Parser...\n');
  
  const testResponses = [
    '{"tool": "write_file", "filename": "test.txt", "content": "Hello World"}',
    'I will create a test file.\n{"tool": "write_file", "filename": "test.txt", "content": "Hello World"}',
    `Creating file now:
    {
      "tool": "write_file",
      "filename": "test.txt",
      "content": "Hello World"
    }`,
    '{"tool": "write_file", "args": {"filename": "test.txt", "content": "Hello World"}}'
  ];
  
  for (let i = 0; i < testResponses.length; i++) {
    console.log(`\nTest ${i + 1}: ${testResponses[i].substring(0, 50)}...`);
    const parsed = JsonToolParser.processResponse(testResponses[i]);
    console.log(`  Has tools: ${parsed.hasTools}`);
    console.log(`  Tool calls: ${parsed.toolCalls.length}`);
    if (parsed.toolCalls.length > 0) {
      console.log(`  Tool name: ${parsed.toolCalls[0].function.name}`);
      console.log(`  Arguments: ${parsed.toolCalls[0].function.arguments}`);
      
      // Try to execute the tool
      try {
        const args = JSON.parse(parsed.toolCalls[0].function.arguments);
        const result = await FileTools.execute(parsed.toolCalls[0].function.name, args);
        console.log(`  ✅ Execution result:`, result);
      } catch (error) {
        console.log(`  ❌ Execution error:`, error.message);
      }
    }
  }
  
  // Clean up test files
  const fs = require('fs');
  if (fs.existsSync('test.txt')) {
    fs.unlinkSync('test.txt');
    console.log('\n✅ Test file cleaned up');
  }
}

testDirect().catch(console.error);