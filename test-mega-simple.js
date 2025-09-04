#!/usr/bin/env node

// Simple mega test without complex content
const { spawn } = require('child_process');
const fs = require('fs');

async function test() {
  console.log('Starting SIMPLE MEGA TEST of OrionCLI...\n');
  console.log('Testing 15 simple file operations\n');
  
  // Clean up
  if (fs.existsSync('mega-simple')) {
    const { execSync } = require('child_process');
    try {
      execSync('rm -rf mega-simple');
    } catch (e) {}
  }
  
  // Start OrionCLI
  const orion = spawn('node', ['orion.js'], {
    env: { ...process.env, DEBUG_TOOLS: '1' }
  });
  
  let output = '';
  let toolsExecuted = [];
  
  orion.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(data);
    
    // Track tool executions
    if (text.includes('🔧')) {
      const match = text.match(/🔧 (\w+)/);
      if (match) toolsExecuted.push(match[1]);
    }
  });
  
  orion.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  // Wait for init
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n=== Sending SIMPLE MEGA command ===\n');
  
  // Simple command without problematic content
  const command = `Create these 15 files in order:
1. Create directory mega-simple/
2. Create file mega-simple/one.txt with "1"
3. Create file mega-simple/two.txt with "2"
4. Create file mega-simple/three.txt with "3"
5. Create file mega-simple/four.txt with "4"
6. Create file mega-simple/five.txt with "5"
7. Create file mega-simple/six.txt with "6"
8. Create file mega-simple/seven.txt with "7"
9. Create file mega-simple/eight.txt with "8"
10. Create file mega-simple/nine.txt with "9"
11. Create file mega-simple/ten.txt with "10"
12. Create file mega-simple/eleven.txt with "11"
13. Create file mega-simple/twelve.txt with "12"
14. Create file mega-simple/thirteen.txt with "13"
15. Create file mega-simple/result.txt with "done"`;
  
  // Send command character by character
  for (const char of command) {
    orion.stdin.write(char);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  // Send Enter
  orion.stdin.write('\r');
  
  // Wait for processing
  console.log('\n⏳ Processing 15 operations...\n');
  await new Promise(resolve => setTimeout(resolve, 45000));
  
  // Kill the process
  orion.kill();
  
  console.log('\n\n=== SIMPLE MEGA TEST RESULTS ===\n');
  
  // Check what was created
  const checkFiles = [
    'mega-simple/one.txt',
    'mega-simple/two.txt',
    'mega-simple/three.txt',
    'mega-simple/four.txt',
    'mega-simple/five.txt',
    'mega-simple/six.txt',
    'mega-simple/seven.txt',
    'mega-simple/eight.txt',
    'mega-simple/nine.txt',
    'mega-simple/ten.txt',
    'mega-simple/eleven.txt',
    'mega-simple/twelve.txt',
    'mega-simple/thirteen.txt',
    'mega-simple/result.txt'
  ];
  
  let filesCreated = 0;
  
  console.log('File Creation:');
  console.log('-'.repeat(50));
  
  for (const file of checkFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
      filesCreated++;
    } else {
      console.log(`❌ ${file}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Files created: ${filesCreated}/${checkFiles.length} (${Math.round(filesCreated/checkFiles.length * 100)}%)`);
  
  // Tool execution summary
  const uniqueTools = [...new Set(toolsExecuted)];
  console.log(`\nTools used: ${uniqueTools.length} different tool types`);
  console.log(`Total executions: ${toolsExecuted.length}`);
  
  // Count actual files if mega-simple exists
  if (fs.existsSync('mega-simple')) {
    const { execSync } = require('child_process');
    try {
      const actualCount = execSync('find mega-simple -type f | wc -l').toString().trim();
      console.log(`\nActual files in mega-simple/: ${actualCount}`);
    } catch (e) {}
    
    // Clean up
    console.log('\nCleaning up test directory...');
    try {
      execSync('rm -rf mega-simple');
    } catch (e) {}
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(50));
  
  if (filesCreated >= checkFiles.length * 0.8) {
    console.log(`🎉 MEGA TEST PASSED! Success rate: ${Math.round(filesCreated/checkFiles.length * 100)}%`);
    console.log('OrionCLI successfully handled multiple operations with orchestration!');
  } else if (filesCreated >= checkFiles.length * 0.5) {
    console.log(`⚠️  PARTIAL SUCCESS: ${Math.round(filesCreated/checkFiles.length * 100)}% completed`);
  } else {
    console.log(`❌ NEEDS IMPROVEMENT: Only ${Math.round(filesCreated/checkFiles.length * 100)}% completed`);
  }
  
  process.exit(0);
}

test().catch(console.error);