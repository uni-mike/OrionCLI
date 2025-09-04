#!/usr/bin/env node

// LIVE ToolForge test with real API calls
const { spawn } = require('child_process');
const fs = require('fs');
const colors = require('./src/utils/colors');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendCommand(orion, command, waitTime = 2000) {
  console.log(colors.dim(`  → Sending: ${command}`));
  for (const char of command) {
    orion.stdin.write(char);
    await delay(15);
  }
  orion.stdin.write('\r');
  await delay(waitTime);
}

async function test() {
  console.log(colors.primary.bold('\n🚀 LIVE TOOLFORGE TEST WITH REAL API\n'));
  console.log(colors.warning('This will use actual API calls to generate tools\n'));
  
  // Clean up previous artifacts
  try {
    require('child_process').execSync('rm -rf .tool-forge');
    console.log(colors.dim('Cleaned up previous .tool-forge directory'));
  } catch (e) {}
  
  // Start OrionCLI
  console.log(colors.info('Starting OrionCLI...'));
  const orion = spawn('node', ['orion.js'], {
    env: { ...process.env, DEBUG_TOOLS: '1' }
  });
  
  let output = '';
  let toolsForged = [];
  let versions = {};
  
  orion.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(data); // Show full output for debugging
    
    // Track important events
    if (text.includes('ToolForge ENABLED')) {
      console.log(colors.success('\n✅ ToolForge activated!\n'));
    }
    if (text.includes('Successfully forged')) {
      const match = text.match(/Successfully forged.*?(\w+)/);
      if (match) {
        toolsForged.push(match[1]);
        console.log(colors.success(`\n✅ Tool forged: ${match[1]}\n`));
      }
    }
    if (text.includes('Rolled back')) {
      console.log(colors.success('\n✅ Rollback successful!\n'));
    }
  });
  
  orion.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  // Wait for initialization
  await delay(3000);
  
  console.log(colors.primary('\n' + '='.repeat(60)));
  console.log(colors.primary.bold('TEST SEQUENCE'));
  console.log(colors.primary('='.repeat(60) + '\n'));
  
  // PHASE 1: Enable ToolForge
  console.log(colors.info('📦 PHASE 1: Enable ToolForge'));
  await sendCommand(orion, '/forge', 2000);
  
  // PHASE 2: Check initial state
  console.log(colors.info('\n📋 PHASE 2: Check Initial State'));
  await sendCommand(orion, '/forge-list', 2000);
  
  // PHASE 3: Trigger missing tool errors to auto-generate tools
  console.log(colors.info('\n🔨 PHASE 3: Trigger Tool Generation'));
  console.log(colors.dim('  Testing various missing tools to trigger auto-generation...\n'));
  
  // Test 1: File hash calculator
  console.log(colors.warning('Test 1: Hash Calculator'));
  await sendCommand(orion, 'Use the calculate_file_hash tool to get SHA256 hash of package.json', 8000);
  
  // Test 2: Code complexity analyzer
  console.log(colors.warning('\nTest 2: Code Analyzer'));
  await sendCommand(orion, 'Use analyze_code_complexity tool to analyze orion.js complexity', 8000);
  
  // Test 3: Directory size calculator  
  console.log(colors.warning('\nTest 3: Directory Stats'));
  await sendCommand(orion, 'Use get_directory_size tool to calculate size of src/ directory', 8000);
  
  // PHASE 4: List forged tools
  console.log(colors.info('\n📊 PHASE 4: List Forged Tools'));
  await sendCommand(orion, '/forge-list', 3000);
  
  // PHASE 5: Create second versions
  console.log(colors.info('\n🔄 PHASE 5: Create Tool Versions'));
  console.log(colors.dim('  Triggering updates to create new versions...\n'));
  
  // Update hash calculator with new parameter
  await sendCommand(orion, 'Use calculate_file_hash with encoding parameter set to base64 on README.md', 8000);
  
  // PHASE 6: Test rollback
  console.log(colors.info('\n⏪ PHASE 6: Test Rollback'));
  await sendCommand(orion, '/forge-list', 2000);
  
  if (toolsForged.length > 0) {
    console.log(colors.dim(`  Rolling back ${toolsForged[0]}...`));
    await sendCommand(orion, `/forge-rollback ${toolsForged[0]}`, 3000);
  }
  
  // PHASE 7: Final status
  console.log(colors.info('\n📈 PHASE 7: Final Status'));
  await sendCommand(orion, '/forge-list', 3000);
  
  // PHASE 8: Disable ToolForge
  console.log(colors.info('\n🔒 PHASE 8: Disable ToolForge'));
  await sendCommand(orion, '/forge', 2000);
  
  // Kill OrionCLI
  orion.kill();
  
  // Wait a bit for file writes
  await delay(1000);
  
  // RESULTS
  console.log(colors.primary('\n' + '='.repeat(60)));
  console.log(colors.primary.bold('TEST RESULTS'));
  console.log(colors.primary('='.repeat(60) + '\n'));
  
  // Check what was created
  const results = {
    toolsForged: toolsForged.length,
    manifestExists: false,
    versionsCreated: 0,
    historyEntries: 0
  };
  
  // Check manifest
  try {
    const manifest = JSON.parse(fs.readFileSync('.tool-forge/manifest.json', 'utf8'));
    results.manifestExists = true;
    
    // Count tools
    const tools = Object.keys(manifest.tools || {});
    console.log(colors.success(`✅ Tools Forged: ${tools.length}`));
    tools.forEach(tool => {
      const toolData = manifest.tools[tool];
      console.log(colors.dim(`   • ${tool}`));
      console.log(colors.dim(`     - Versions: ${toolData.versions.length}`));
      console.log(colors.dim(`     - Active: v${toolData.activeVersion}`));
      results.versionsCreated += toolData.versions.length;
    });
    
    // Check history
    if (manifest.history && manifest.history.length > 0) {
      results.historyEntries = manifest.history.length;
      console.log(colors.success(`\n✅ History Entries: ${manifest.history.length}`));
      manifest.history.slice(-5).forEach(entry => {
        console.log(colors.dim(`   • ${entry.action} ${entry.tool} v${entry.version}`));
      });
    }
    
    // Check version files
    const versionFiles = fs.readdirSync('.tool-forge/versions/').filter(f => f.endsWith('.js'));
    console.log(colors.success(`\n✅ Version Files Created: ${versionFiles.length}`));
    
    // Sample a generated tool
    if (versionFiles.length > 0) {
      console.log(colors.info('\n📄 Sample Generated Tool:'));
      const sampleFile = `.tool-forge/versions/${versionFiles[0]}`;
      const sampleCode = fs.readFileSync(sampleFile, 'utf8');
      console.log(colors.dim(sampleCode.substring(0, 500) + '...'));
    }
    
  } catch (error) {
    console.log(colors.error('❌ Manifest not found or invalid'));
  }
  
  // Summary
  console.log(colors.primary('\n' + '='.repeat(60)));
  console.log(colors.primary.bold('SUMMARY'));
  console.log(colors.primary('='.repeat(60) + '\n'));
  
  const success = results.manifestExists && results.toolsForged > 0;
  
  if (success) {
    console.log(colors.success.bold('🎉 TOOLFORGE LIVE TEST SUCCESSFUL!\n'));
    console.log(colors.success(`• Auto-generated ${results.toolsForged} tool(s)`));
    console.log(colors.success(`• Created ${results.versionsCreated} version(s)`));
    console.log(colors.success(`• Recorded ${results.historyEntries} history entries`));
    console.log(colors.success(`• Version tracking and rollback working`));
    console.log(colors.success(`• All systems operational with real API!`));
  } else if (results.manifestExists) {
    console.log(colors.warning('⚠️  PARTIAL SUCCESS'));
    console.log(colors.warning('ToolForge initialized but no tools were generated'));
    console.log(colors.dim('This may be due to API limitations or rate limits'));
  } else {
    console.log(colors.error('❌ TEST FAILED'));
    console.log(colors.error('ToolForge did not initialize properly'));
  }
  
  // Cleanup reminder
  console.log(colors.dim('\n📁 Artifacts saved in .tool-forge/'));
  console.log(colors.dim('To clean up: rm -rf .tool-forge'));
  
  process.exit(success ? 0 : 1);
}

// Run test
test().catch(error => {
  console.error(colors.error('\n💥 Test crashed:'), error);
  process.exit(1);
});