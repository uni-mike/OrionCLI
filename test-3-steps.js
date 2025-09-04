#!/usr/bin/env node

// Test with just 3 steps to verify orchestration works
const { spawn } = require('child_process');
const fs = require('fs');

async function test() {
  console.log('Starting 3-STEP TEST of OrionCLI...\n');
  
  // Clean up
  if (fs.existsSync('test-3steps')) {
    const { execSync } = require('child_process');
    try {
      execSync('rm -rf test-3steps');
    } catch (e) {}
  }
  
  // Start OrionCLI with debug
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
  
  console.log('\n=== Sending 3-STEP TEST command ===\n');
  
  // Simple 3-step command
  const command = `Create test-3steps/ directory, then create test-3steps/README.md with "Test", then list files in test-3steps/`;
  
  // Send command
  for (const char of command) {
    orion.stdin.write(char);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  // Send Enter
  orion.stdin.write('\r');
  
  // Wait for processing
  console.log('\n⏳ Processing...\n');
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  // Kill the process
  orion.kill();
  
  console.log('\n\n=== TEST RESULTS ===\n');
  
  // Check what was created
  if (fs.existsSync('test-3steps')) {
    console.log('✅ Directory created');
    if (fs.existsSync('test-3steps/README.md')) {
      const content = fs.readFileSync('test-3steps/README.md', 'utf8');
      console.log(`✅ README.md created with: "${content}"`);
    } else {
      console.log('❌ README.md NOT created');
    }
    // Clean up
    const { execSync } = require('child_process');
    execSync('rm -rf test-3steps');
  } else {
    console.log('❌ Directory was NOT created');
  }
  
  // Check if orchestration was mentioned
  if (output.includes('orchestration') || output.includes('Orchestration')) {
    console.log('\n🎯 Orchestration was mentioned');
  }
  
  process.exit(0);
}

test().catch(console.error);