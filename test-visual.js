#!/usr/bin/env node

// Visual test to see final state
const { spawn } = require('child_process');
const fs = require('fs');

async function test() {
  console.log('Starting OrionCLI visual test...\n');
  
  // Clean up
  if (fs.existsSync('test.txt')) {
    fs.unlinkSync('test.txt');
  }
  
  // Start OrionCLI 
  const orion = spawn('node', ['orion.js'], {
    env: { ...process.env, DEBUG_TOOLS: '1' }
  });
  
  let lastOutput = '';
  
  orion.stdout.on('data', (data) => {
    lastOutput = data.toString();
    process.stdout.write(data);
  });
  
  orion.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Send command character by character
  const command = 'create test.txt with hello world';
  for (const char of command) {
    orion.stdin.write(char);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Send Enter
  orion.stdin.write('\r');
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  console.log('\n\n=== FINAL STATE (last output) ===');
  console.log(lastOutput);
  console.log('=== END FINAL STATE ===\n');
  
  // Check spinner
  if (lastOutput.includes('Processing...') || lastOutput.includes('⠇')) {
    console.log('❌ SPINNER STILL VISIBLE');
  } else {
    console.log('✅ Spinner cleared');
  }
  
  // Kill the process
  orion.kill();
  
  // Clean up
  if (fs.existsSync('test.txt')) {
    fs.unlinkSync('test.txt');
  }
  
  process.exit(0);
}

test().catch(console.error);