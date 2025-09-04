#!/usr/bin/env node

// Final test - check if UI returns to normal after processing
const { spawn } = require('child_process');
const fs = require('fs');

async function test() {
  console.log('Starting final OrionCLI test...\n');
  
  // Clean up
  if (fs.existsSync('test.txt')) {
    fs.unlinkSync('test.txt');
  }
  
  // Start OrionCLI 
  const orion = spawn('node', ['orion.js'], {
    env: { ...process.env }  // No debug
  });
  
  let output = '';
  let lastChunk = '';
  
  orion.stdout.on('data', (data) => {
    output += data.toString();
    lastChunk = data.toString();
    process.stdout.write(data);
  });
  
  orion.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n=== Sending command ===');
  
  // Send command character by character
  const command = 'create test.txt with hello world';
  for (const char of command) {
    orion.stdin.write(char);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  
  // Send Enter
  orion.stdin.write('\r');
  
  // Wait for processing to complete
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('\n=== Final UI State ===');
  
  // Check final state
  const finalLines = output.split('\n').slice(-10);
  console.log(finalLines.join('\n'));
  
  // Check what's visible
  if (lastChunk.includes('Processing...')) {
    console.log('\n❌ Spinner still visible in UI');
  } else if (lastChunk.includes('Tab: Complete')) {
    console.log('\n✅ UI returned to normal (showing help line)');
  } else {
    console.log('\n⚠️  UI in unknown state');
  }
  
  // Check file
  if (fs.existsSync('test.txt')) {
    console.log('✅ File was created successfully');
    fs.unlinkSync('test.txt');
  }
  
  // Kill the process
  orion.kill();
  
  process.exit(0);
}

test().catch(console.error);