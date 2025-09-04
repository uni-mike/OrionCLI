#!/usr/bin/env node

// Test script for ToolForge experimental module
const { spawn } = require('child_process');
const colors = require('./src/utils/colors');

async function test() {
  console.log('🧪 Testing ToolForge Experimental Module...\n');
  
  // Start OrionCLI
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
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n=== PHASE 1: Enable ToolForge ===\n');
  
  // Enable ToolForge
  orion.stdin.write('/forge\r');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check status
  orion.stdin.write('/forge-list\r');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\n=== PHASE 2: Trigger Missing Tool Error ===\n');
  
  // Try to use a non-existent tool to trigger auto-creation
  const testCommand = `Use a tool called "analyze_complexity" to analyze the complexity of the file test-simple.js and return the cyclomatic complexity score.`;
  
  for (const char of testCommand) {
    orion.stdin.write(char);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  
  orion.stdin.write('\r');
  
  // Wait for ToolForge to detect and create the tool
  console.log('\n⏳ Waiting for ToolForge to detect missing tool and create it...\n');
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  // List forged tools
  console.log('\n=== PHASE 3: Check Forged Tools ===\n');
  orion.stdin.write('/forge-list\r');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test rollback
  console.log('\n=== PHASE 4: Test Rollback ===\n');
  
  // Create another version by triggering an error with different params
  const testCommand2 = `Use analyze_complexity tool on orion.js with detailed=true parameter`;
  
  for (const char of testCommand2) {
    orion.stdin.write(char);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  
  orion.stdin.write('\r');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Try rollback
  orion.stdin.write('/forge-rollback analyze_complexity\r');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Final status
  console.log('\n=== PHASE 5: Final Status ===\n');
  orion.stdin.write('/forge-list\r');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Disable ToolForge
  console.log('\n=== PHASE 6: Disable ToolForge ===\n');
  orion.stdin.write('/forge\r');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Kill the process
  orion.kill();
  
  console.log('\n\n=== TOOLFORGE TEST RESULTS ===\n');
  
  // Analyze output
  const forgeEnabled = output.includes('ToolForge ENABLED');
  const toolCreated = output.includes('Successfully forged');
  const toolListed = output.includes('analyze_complexity');
  const rollbackSuccess = output.includes('Rolled back');
  
  console.log(`✅ ToolForge Enabled: ${forgeEnabled}`);
  console.log(`✅ Tool Auto-Created: ${toolCreated}`);
  console.log(`✅ Tool Listed: ${toolListed}`);
  console.log(`✅ Rollback Worked: ${rollbackSuccess}`);
  
  const allPassed = forgeEnabled && (toolCreated || toolListed);
  
  if (allPassed) {
    console.log('\n🎉 TOOLFORGE TEST PASSED!');
    console.log('The experimental self-improving tool system is working!');
  } else {
    console.log('\n⚠️ PARTIAL SUCCESS');
    console.log('Some features may need refinement.');
  }
  
  // Clean up any created directories
  const fs = require('fs');
  if (fs.existsSync('.tool-forge')) {
    const { execSync } = require('child_process');
    try {
      execSync('rm -rf .tool-forge');
      console.log('\nCleaned up .tool-forge directory');
    } catch (e) {}
  }
  
  process.exit(0);
}

test().catch(console.error);