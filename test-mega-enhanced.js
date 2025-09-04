#!/usr/bin/env node

// Enhanced mega test with clearer instructions
const { spawn } = require('child_process');
const fs = require('fs');

async function test() {
  console.log('Starting ENHANCED MEGA TEST of OrionCLI...\n');
  console.log('Testing autonomous error handling and 20+ tool execution\n');
  
  // Clean up
  if (fs.existsSync('mega-test')) {
    const { execSync } = require('child_process');
    try {
      execSync('rm -rf mega-test');
    } catch (e) {}
  }
  
  // Start OrionCLI
  const orion = spawn('node', ['orion.js'], {
    env: { ...process.env }
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
  
  console.log('\n=== Sending ENHANCED MEGA TEST command ===\n');
  
  // Clearer, more structured mega command
  const command = `Execute these 25 operations in order:
1. Create directory mega-test/
2. Create mega-test/README.md with "# Mega Test Project"
3. Create mega-test/docs/ directory
4. Create mega-test/docs/guide.md with "User Guide"
5. Create mega-test/docs/api.md with "API Documentation"
6. Create mega-test/src/ directory
7. Create mega-test/src/index.js with "console.log('Hello');"
8. Create mega-test/src/utils.js with "exports.helper = () => true;"
9. Create mega-test/tests/ directory
10. Create mega-test/tests/test.js with "// Unit tests"
11. Create mega-test/config.json with {"name": "mega-test", "version": "1.0"}
12. Create mega-test/package.json with {"name": "mega-test", "main": "src/index.js"}
13. List files in mega-test/ directory
14. Read mega-test/README.md
15. Create mega-test/data/ directory
16. Create mega-test/data/sample.txt with "Sample data"
17. Execute bash command: echo "Test" > mega-test/output.txt
18. List all .js files using bash: find mega-test -name "*.js"
19. Get word count of all files: wc -l mega-test/**/*
20. Create mega-test/.gitignore with "node_modules/"
21. Create mega-test/Dockerfile with "FROM node:18"
22. Create mega-test/build/ directory
23. Create mega-test/build/info.txt with build date using: date > mega-test/build/info.txt
24. Create mega-test/SUMMARY.md listing all created items
25. Finally, count total files created with: find mega-test -type f | wc -l`;
  
  // Send command character by character
  for (const char of command) {
    orion.stdin.write(char);
    await new Promise(resolve => setTimeout(resolve, 15));
  }
  
  // Send Enter
  orion.stdin.write('\r');
  
  // Wait for processing (longer for 25 operations)
  console.log('\n⏳ Processing 25 operations... this will take 45-60 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  // Kill the process
  orion.kill();
  
  console.log('\n\n=== ENHANCED MEGA TEST RESULTS ===\n');
  
  // Check what was created
  const checkFiles = [
    'mega-test/README.md',
    'mega-test/docs/guide.md',
    'mega-test/docs/api.md',
    'mega-test/src/index.js',
    'mega-test/src/utils.js',
    'mega-test/tests/test.js',
    'mega-test/config.json',
    'mega-test/package.json',
    'mega-test/data/sample.txt',
    'mega-test/output.txt',
    'mega-test/.gitignore',
    'mega-test/Dockerfile',
    'mega-test/build/info.txt',
    'mega-test/SUMMARY.md'
  ];
  
  const checkDirs = [
    'mega-test',
    'mega-test/docs',
    'mega-test/src',
    'mega-test/tests',
    'mega-test/data',
    'mega-test/build'
  ];
  
  let filesCreated = 0;
  let dirsCreated = 0;
  
  console.log('Directory Creation:');
  console.log('-'.repeat(50));
  for (const dir of checkDirs) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      console.log(`✅ ${dir}/`);
      dirsCreated++;
    } else {
      console.log(`❌ ${dir}/`);
    }
  }
  
  console.log('\nFile Creation:');
  console.log('-'.repeat(50));
  for (const file of checkFiles) {
    if (fs.existsSync(file)) {
      const size = fs.statSync(file).size;
      console.log(`✅ ${file} (${size} bytes)`);
      filesCreated++;
    } else {
      console.log(`❌ ${file}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Directories created: ${dirsCreated}/${checkDirs.length} (${Math.round(dirsCreated/checkDirs.length * 100)}%)`);
  console.log(`Files created: ${filesCreated}/${checkFiles.length} (${Math.round(filesCreated/checkFiles.length * 100)}%)`);
  
  // Tool execution summary
  const uniqueTools = [...new Set(toolsExecuted)];
  console.log(`\nTools used: ${uniqueTools.length} different tool types`);
  console.log(`Total executions: ${toolsExecuted.length}`);
  
  // Count actual files if mega-test exists
  if (fs.existsSync('mega-test')) {
    const { execSync } = require('child_process');
    try {
      const actualCount = execSync('find mega-test -type f | wc -l').toString().trim();
      console.log(`\nActual files in mega-test/: ${actualCount}`);
    } catch (e) {}
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(50));
  const totalSuccess = filesCreated + dirsCreated;
  const totalExpected = checkFiles.length + checkDirs.length;
  const successRate = Math.round(totalSuccess / totalExpected * 100);
  
  if (successRate >= 80) {
    console.log(`🎉 MEGA TEST PASSED! Success rate: ${successRate}%`);
    console.log('OrionCLI successfully handled 25 complex operations!');
  } else if (successRate >= 50) {
    console.log(`⚠️  PARTIAL SUCCESS: ${successRate}% completed`);
  } else {
    console.log(`❌ NEEDS IMPROVEMENT: Only ${successRate}% completed`);
  }
  
  // Clean up
  if (fs.existsSync('mega-test') && successRate > 0) {
    console.log('\nCleaning up test directory...');
    const { execSync } = require('child_process');
    try {
      execSync('rm -rf mega-test');
    } catch (e) {}
  }
  
  process.exit(0);
}

test().catch(console.error);