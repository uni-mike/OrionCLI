#!/usr/bin/env node

// Simple debug test for OrionCLI
const { spawn } = require('child_process');
const fs = require('fs');

async function test() {
  console.log('Starting SIMPLE DEBUG TEST of OrionCLI...\n');
  
  // Clean up
  if (fs.existsSync('test-output.txt')) {
    fs.unlinkSync('test-output.txt');
  }
  
  // Start OrionCLI with debug mode
  const orion = spawn('node', ['orion.js'], {
    env: { ...process.env, DEBUG_TOOLS: '1' }
  });
  
  let output = '';
  
  orion.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(data);
  });
  
  orion.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  // Wait for init
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n=== Sending SIMPLE TEST command ===\n');
  
  // Very simple command
  const command = `Create test-output.txt with "Hello World"`;
  
  // Send command
  for (const char of command) {
    orion.stdin.write(char);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  // Send Enter
  orion.stdin.write('\r');
  
  // Wait for processing
  console.log('\n⏳ Processing...\n');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Kill the process
  orion.kill();
  
  console.log('\n\n=== TEST RESULTS ===\n');
  
  // Check if file was created
  if (fs.existsSync('test-output.txt')) {
    const content = fs.readFileSync('test-output.txt', 'utf8');
    console.log('✅ File created successfully!');
    console.log(`Content: "${content}"`);
    fs.unlinkSync('test-output.txt'); // Clean up
  } else {
    console.log('❌ File was NOT created');
    console.log('\n=== Full Output ===\n');
    console.log(output);
  }
  
  process.exit(0);
}

test().catch(console.error);