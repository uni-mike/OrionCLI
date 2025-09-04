#!/usr/bin/env node

// Fixed test for OrionCLI - sends input character by character
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
  
  // Send command character by character
  const command = 'create test.txt with hello world';
  for (const char of command) {
    orion.stdin.write(char);
    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between chars
  }
  
  // Send Enter (carriage return)
  orion.stdin.write('\r');
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Kill the process
  orion.kill();
  
  console.log('\n\n=== Test Results ===\n');
  
  // Check if file was created
  if (fs.existsSync('test.txt')) {
    const content = fs.readFileSync('test.txt', 'utf8');
    console.log('✅ test.txt was created');
    console.log('Content:', content);
    
    // Check for confirmation message
    if (output.includes('✅ File') && output.includes('created successfully')) {
      console.log('✅ Tool output confirmation was shown');
    } else if (output.includes('✅ Done!')) {
      console.log('✅ General confirmation was shown');  
    } else {
      console.log('⚠️  No confirmation message found');
    }
    
    fs.unlinkSync('test.txt');
  } else {
    console.log('❌ test.txt was NOT created');
    
    // Check for errors
    if (errorOutput) {
      console.log('\nErrors found:');
      console.log(errorOutput);
    }
    
    // Check for "Processing input"
    if (output.includes('Processing input')) {
      console.log('✅ Input was processed');
    } else {
      console.log('❌ Input was NOT processed');
    }
    
    // Check for API call
    if (output.includes('Calling Azure')) {
      console.log('✅ API was called');
    } else {
      console.log('❌ API was NOT called');
    }
  }
  
  process.exit(0);
}

test().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});