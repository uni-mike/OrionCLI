#!/usr/bin/env node

// Test script for OrionCLI tool execution
const { spawn } = require('child_process');
const readline = require('readline');

async function testOrionCLI() {
  console.log('Starting OrionCLI test...\n');
  
  // Start OrionCLI process
  const orion = spawn('node', ['orion.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let errorOutput = '';
  
  // Capture output
  orion.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(text);
  });
  
  orion.stderr.on('data', (data) => {
    const text = data.toString();
    errorOutput += text;
    process.stderr.write(text);
  });

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Send test command
  const testCommand = 'create a simple test.txt file with the content "Hello World"\n';
  console.log('\n\nSending test command:', testCommand);
  orion.stdin.write(testCommand);
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check if file was created
  const fs = require('fs');
  if (fs.existsSync('test.txt')) {
    const content = fs.readFileSync('test.txt', 'utf8');
    console.log('\n✅ SUCCESS: test.txt was created');
    console.log('Content:', content);
    
    // Check for confirmation message in output
    if (output.includes('✅ File created successfully!') || 
        output.includes('✅ Done!')) {
      console.log('✅ Confirmation message was shown');
    } else {
      console.log('⚠️  No confirmation message found in output');
    }
    
    // Clean up
    fs.unlinkSync('test.txt');
    console.log('Test file cleaned up');
  } else {
    console.log('\n❌ FAILURE: test.txt was not created');
    console.log('Output received:', output.slice(-500));
  }
  
  // Kill the process
  orion.kill();
  
  process.exit(0);
}

testOrionCLI().catch(console.error);