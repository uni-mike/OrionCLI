#!/usr/bin/env node

// Simple non-interactive test for OrionCLI
const { spawn } = require('child_process');
const fs = require('fs');

async function test() {
  console.log('Starting OrionCLI test...\n');
  
  // Clean up any existing test file
  if (fs.existsSync('test.txt')) {
    fs.unlinkSync('test.txt');
  }
  
  // Start OrionCLI 
  const orion = spawn('node', ['orion.js'], {
    env: { ...process.env, DEBUG_TOOLS: '1' }
  });
  
  let output = '';
  let errorOutput = '';
  
  orion.stdout.on('data', (data) => {
    output += data.toString();
    process.stdout.write(data);
  });
  
  orion.stderr.on('data', (data) => {
    errorOutput += data.toString();
    process.stderr.write(data);
  });
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n\n=== Sending test command ===\n');
  orion.stdin.write('create test.txt with hello world\r');
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  // Kill the process
  orion.kill();
  
  console.log('\n\n=== Test Results ===\n');
  
  // Check if file was created
  if (fs.existsSync('test.txt')) {
    const content = fs.readFileSync('test.txt', 'utf8');
    console.log('✅ test.txt was created');
    console.log('Content:', content);
    fs.unlinkSync('test.txt');
  } else {
    console.log('❌ test.txt was NOT created');
    
    // Check for errors
    if (errorOutput) {
      console.log('\nErrors found:');
      console.log(errorOutput);
    }
    
    // Show last part of output for debugging
    console.log('\nLast output:');
    console.log(output.slice(-1000));
  }
  
  process.exit(0);
}

test().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});