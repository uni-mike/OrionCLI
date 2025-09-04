#!/usr/bin/env node

// Mega test for all OrionCLI tools
const { spawn } = require('child_process');
const fs = require('fs');

async function test() {
  console.log('Starting MEGA TEST of OrionCLI...\n');
  console.log('This will test: File ops, Git, Web search, System tools, SSH, Code generation, and more!\n');
  
  // Clean up
  if (fs.existsSync('comprehensive-analysis')) {
    const { exec } = require('child_process');
    exec('rm -rf comprehensive-analysis', (err) => {
      if (err) console.log('Could not clean up old test directory');
    });
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
  
  console.log('\n=== Sending MEGA TEST command ===\n');
  
  // Comprehensive but manageable test command
  const command = `Perform a complete analysis: First search the web for "nodejs best practices 2024". List all .js files. Read package.json and orion.js. Find all TODO comments in code. Create analysis/ directory. Save web results to analysis/web.md. Create analysis/diagram.mermaid with flowchart: Start -> Process -> Output. Write analysis/calculator.js with add and multiply functions. Create analysis/review.md reviewing code quality. Get git status and save to analysis/git.txt. Get system info to analysis/system.txt. Create analysis/docker/Dockerfile for Node.js. SSH to 10.0.10.11 to check Docker status, save to analysis/ssh.txt. Create analysis/data.json with project info. Convert data.json to base64 in analysis/data.b64. Generate MD5 hash of "test" in analysis/hash.txt. Create analysis/test.js with a unit test. Add comment "// Validated" to test.js. Create analysis/docs.md with usage guide. Count lines in all .js files to analysis/metrics.txt. Create analysis/REPORT.html summarizing everything. List all created files in analysis/manifest.txt`;
  
  // Send command character by character  
  for (const char of command) {
    orion.stdin.write(char);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  
  // Send Enter
  orion.stdin.write('\r');
  
  // Wait for processing (this will take a while!)
  console.log('\n⏳ Processing... this will take 30-60 seconds for all tools...\n');
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  // Kill the process
  orion.kill();
  
  console.log('\n\n=== MEGA TEST RESULTS ===\n');
  
  // Check what was created
  const checkFiles = [
    'analysis/web.md',
    'analysis/diagram.mermaid',
    'analysis/calculator.js',
    'analysis/review.md',
    'analysis/git.txt',
    'analysis/system.txt',
    'analysis/docker/Dockerfile',
    'analysis/ssh.txt',
    'analysis/data.json',
    'analysis/data.b64',
    'analysis/hash.txt',
    'analysis/test.js',
    'analysis/docs.md',
    'analysis/metrics.txt',
    'analysis/REPORT.html',
    'analysis/manifest.txt'
  ];
  
  let created = 0;
  let missing = [];
  
  console.log('File Creation Results:');
  console.log('-'.repeat(50));
  
  for (const file of checkFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
      created++;
    } else {
      console.log(`❌ ${file}`);
      missing.push(file);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Files created: ${created}/${checkFiles.length}`);
  console.log(`Success rate: ${Math.round(created/checkFiles.length * 100)}%`);
  
  // Tool execution summary
  const uniqueTools = [...new Set(toolsExecuted)];
  console.log(`\nTools used: ${uniqueTools.length} different tools`);
  console.log(`Total executions: ${toolsExecuted.length}`);
  console.log('\nTool types executed:');
  const toolCounts = {};
  toolsExecuted.forEach(tool => {
    toolCounts[tool] = (toolCounts[tool] || 0) + 1;
  });
  Object.entries(toolCounts).forEach(([tool, count]) => {
    console.log(`  ${tool}: ${count}x`);
  });
  
  // Performance metrics
  const hasWebSearch = output.includes('web_search') || output.includes('Web search');
  const hasSSH = output.includes('ssh_') || output.includes('SSH');
  const hasGit = output.includes('git_') || output.includes('git status');
  const hasSystem = output.includes('system_info') || output.includes('System');
  const hasDocker = output.includes('docker') || output.includes('Docker');
  
  console.log('\nCapabilities tested:');
  console.log(`  Web Search: ${hasWebSearch ? '✅' : '❌'}`);
  console.log(`  SSH: ${hasSSH ? '✅' : '❌'}`);
  console.log(`  Git: ${hasGit ? '✅' : '❌'}`);
  console.log(`  System: ${hasSystem ? '✅' : '❌'}`);
  console.log(`  Docker: ${hasDocker ? '✅' : '❌'}`);
  
  // Final verdict
  console.log('\n' + '='.repeat(50));
  if (created >= checkFiles.length * 0.8) {
    console.log('🎉 MEGA TEST PASSED! OrionCLI handled complex multi-tool execution successfully!');
  } else if (created >= checkFiles.length * 0.5) {
    console.log('⚠️  PARTIAL SUCCESS: Some tools worked but not all');
  } else {
    console.log('❌ TEST NEEDS WORK: Many tools did not execute');
  }
  
  if (missing.length > 0 && missing.length <= 5) {
    console.log('\nMissing files:', missing.join(', '));
  }
  
  process.exit(0);
}

test().catch(console.error);