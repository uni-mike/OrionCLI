#!/usr/bin/env node

// Test multi-tool execution
const { spawn } = require('child_process');
const fs = require('fs');

async function test() {
  console.log('Testing multi-tool execution...\n');
  
  // Clean up any test files
  ['file1.txt', 'file2.txt', 'file3.txt'].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
  
  // Start OrionCLI
  const orion = spawn('node', ['orion.js'], {
    env: { ...process.env, DEBUG_TOOLS: '1' }
  });
  
  let output = '';
  
  orion.stdout.on('data', (data) => {
    output += data.toString();
    process.stdout.write(data);
  });
  
  orion.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  // Wait for init
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n=== Sending multi-tool command ===\n');
  
  // Send a command that requires multiple tools
  const command = 'create three files: file1.txt with "First", file2.txt with "Second", and file3.txt with "Third"';
  
  for (const char of command) {
    orion.stdin.write(char);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  
  // Send Enter
  orion.stdin.write('\r');
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  // Kill the process
  orion.kill();
  
  console.log('\n\n=== Test Results ===\n');
  
  // Check which files were created
  let created = 0;
  ['file1.txt', 'file2.txt', 'file3.txt'].forEach(filename => {
    if (fs.existsSync(filename)) {
      const content = fs.readFileSync(filename, 'utf8');
      console.log(`✅ ${filename} created with content: "${content}"`);
      fs.unlinkSync(filename);
      created++;
    } else {
      console.log(`❌ ${filename} NOT created`);
    }
  });
  
  console.log(`\nTotal files created: ${created}/3`);
  
  // Check for multiple tool executions
  const toolExecutions = (output.match(/🔧 write_file/g) || []).length;
  console.log(`Tool executions found: ${toolExecutions}`);
  
  if (created === 3) {
    console.log('\n✅ SUCCESS: Multi-tool execution working!');
  } else {
    console.log('\n⚠️  PARTIAL: Some tools executed but not all');
  }
  
  process.exit(0);
}

test().catch(console.error);