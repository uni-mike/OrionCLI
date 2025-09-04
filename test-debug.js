#!/usr/bin/env node

// Debug test to check tool execution
const FileTools = require('./src/tools/file-tools');

async function test() {
  console.log('Testing FileTools directly...\n');
  
  // Test write_file
  const result = await FileTools.execute('write_file', {
    filename: 'debug-test.txt',
    content: 'Debug test content'
  });
  
  console.log('Result from FileTools.execute:');
  console.log(result);
  
  // Clean up
  const fs = require('fs');
  if (fs.existsSync('debug-test.txt')) {
    fs.unlinkSync('debug-test.txt');
    console.log('\nTest file cleaned up');
  }
}

test().catch(console.error);