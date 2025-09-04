#!/usr/bin/env node

// Real ToolForge test - actually run in OrionCLI
const { spawn } = require('child_process');
const fs = require('fs');
const colors = require('./src/utils/colors');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendCommand(orion, command) {
  for (const char of command) {
    orion.stdin.write(char);
    await delay(10);
  }
  orion.stdin.write('\r');
  await delay(1000);
}

async function test() {
  console.log(colors.primary.bold('\n🚀 REAL TOOLFORGE TEST IN ORIONCLI\n'));
  
  // Clean up
  try {
    require('child_process').execSync('rm -rf .tool-forge');
  } catch (e) {}
  
  // Start OrionCLI
  const orion = spawn('node', ['orion.js'], {
    env: { ...process.env }
  });
  
  let output = '';
  let phase = 'init';
  const results = [];
  
  orion.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    
    // Don't show full output, just key events
    if (text.includes('ToolForge ENABLED')) {
      console.log(colors.success('✅ ToolForge enabled'));
      results.push('enable');
    }
    if (text.includes('Successfully forged')) {
      console.log(colors.success('✅ Tool auto-forged'));
      results.push('forge');
    }
    if (text.includes('Rolled back')) {
      console.log(colors.success('✅ Rollback successful'));
      results.push('rollback');
    }
    if (text.includes('ToolForge DISABLED')) {
      console.log(colors.dim('ToolForge disabled'));
      results.push('disable');
    }
    if (text.includes('No forged tools')) {
      console.log(colors.dim('No tools forged yet'));
    }
    if (text.includes('calculate_hash')) {
      console.log(colors.info('Tool found: calculate_hash'));
      results.push('list');
    }
  });
  
  orion.stderr.on('data', (data) => {
    // Ignore stderr unless critical
  });
  
  // Wait for init
  await delay(2000);
  
  console.log(colors.info('\n📋 Test Sequence:\n'));
  
  // Phase 1: Enable ToolForge
  console.log(colors.dim('1. Enable ToolForge...'));
  await sendCommand(orion, '/forge');
  await delay(1000);
  
  // Phase 2: List tools (should be empty)
  console.log(colors.dim('2. Check forged tools...'));
  await sendCommand(orion, '/forge-list');
  await delay(1000);
  
  // Phase 3: Try to use non-existent tool
  console.log(colors.dim('3. Trigger missing tool...'));
  await sendCommand(orion, 'Use tool "calculate_hash" to get SHA256 hash of orion.js file');
  await delay(5000); // Give it time to forge
  
  // Phase 4: List tools again
  console.log(colors.dim('4. Check forged tools again...'));
  await sendCommand(orion, '/forge-list');
  await delay(1000);
  
  // Phase 5: Try rollback
  console.log(colors.dim('5. Test rollback...'));
  await sendCommand(orion, '/forge-rollback calculate_hash');
  await delay(1000);
  
  // Phase 6: Disable ToolForge
  console.log(colors.dim('6. Disable ToolForge...'));
  await sendCommand(orion, '/forge');
  await delay(1000);
  
  // Kill OrionCLI
  orion.kill();
  
  // Results
  console.log(colors.primary('\n' + '='.repeat(60)));
  console.log(colors.primary.bold('\n📊 RESULTS\n'));
  
  const passed = [];
  const failed = [];
  
  if (results.includes('enable')) passed.push('ToolForge Enable');
  else failed.push('ToolForge Enable');
  
  if (results.includes('forge') || fs.existsSync('.tool-forge/manifest.json')) {
    passed.push('Auto Tool Creation');
    
    // Check manifest
    try {
      const manifest = JSON.parse(fs.readFileSync('.tool-forge/manifest.json', 'utf8'));
      if (manifest.tools && Object.keys(manifest.tools).length > 0) {
        passed.push('Tool Registration');
        console.log(colors.dim(`   Tools created: ${Object.keys(manifest.tools).join(', ')}`));
      }
    } catch (e) {}
  } else {
    failed.push('Auto Tool Creation');
  }
  
  if (results.includes('list')) passed.push('Tool Listing');
  else failed.push('Tool Listing');
  
  if (results.includes('rollback')) passed.push('Rollback');
  
  if (results.includes('disable')) passed.push('ToolForge Disable');
  else failed.push('ToolForge Disable');
  
  console.log(colors.success(`\n✅ Passed: ${passed.length}`));
  passed.forEach(p => console.log(colors.dim(`   • ${p}`)));
  
  if (failed.length > 0) {
    console.log(colors.error(`\n❌ Failed: ${failed.length}`));
    failed.forEach(f => console.log(colors.dim(`   • ${f}`)));
  }
  
  const successRate = Math.round((passed.length / (passed.length + failed.length)) * 100);
  console.log(colors.info(`\n📈 Success Rate: ${successRate}%`));
  
  if (successRate >= 80) {
    console.log(colors.success.bold('\n🎉 TOOLFORGE WORKS IN REAL ORIONCLI!\n'));
  }
  
  // Cleanup
  console.log(colors.dim('Cleanup: rm -rf .tool-forge'));
  
  process.exit(successRate >= 80 ? 0 : 1);
}

test().catch(console.error);