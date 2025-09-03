#!/usr/bin/env node

/**
 * Test script for OrionCLI modular tools
 */
const OrionToolRegistry = require('./src/tools/orion-tool-registry');

async function testTools() {
  const registry = new OrionToolRegistry();
  
  console.log('🧪 Testing OrionCLI Modular Tool System\n');
  
  // Test 1: Get available categories
  console.log('📂 Available Tool Categories:');
  const categories = registry.getAvailableCategories();
  categories.forEach(cat => console.log(`  • ${cat}`));
  console.log();
  
  // Test 2: Get tools summary
  console.log('🛠️ Tools Summary:');
  const summary = registry.getToolsSummary();
  summary.forEach(cat => {
    console.log(`  ${cat.category}: ${cat.count} tools`);
    console.log(`    Tools: ${cat.tools.slice(0, 3).join(', ')}${cat.tools.length > 3 ? '...' : ''}`);
  });
  console.log();
  
  // Test 3: Test file operations
  console.log('📝 Testing File Operations:');
  try {
    const writeResult = await registry.executeTool('write_file', {
      filename: 'test-output.txt',
      content: 'Hello from OrionCLI!'
    });
    console.log(`  ✅ ${writeResult}`);
    
    const readResult = await registry.executeTool('read_file', {
      filename: 'test-output.txt'
    });
    console.log(`  ✅ Read: ${readResult.substring(0, 50)}...`);
    
    // Clean up
    const { unlink } = require('fs').promises;
    await unlink('test-output.txt');
    console.log('  ✅ Cleanup successful');
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  console.log();
  
  // Test 4: Test system tools
  console.log('💻 Testing System Tools:');
  try {
    const systemInfo = await registry.executeTool('system_info', {});
    console.log(`  ✅ System info retrieved`);
    console.log(systemInfo.split('\n').slice(0, 3).map(l => '    ' + l).join('\n'));
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  console.log();
  
  // Test 5: Test git tools
  console.log('🔀 Testing Git Tools:');
  try {
    const gitStatus = await registry.executeTool('git_status', {});
    console.log(`  ✅ Git status retrieved`);
    console.log(gitStatus.split('\n').slice(0, 2).map(l => '    ' + l).join('\n'));
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  console.log();
  
  // Test 6: Search tools
  console.log('🔍 Testing Search Tools:');
  const searchResults = registry.searchTools('file');
  console.log(`  Found ${searchResults.length} tools matching "file":`);
  searchResults.slice(0, 3).forEach(tool => {
    console.log(`    • ${tool.name} (${tool.category})`);
  });
  console.log();
  
  console.log('✅ All tests completed!');
}

// Run tests
testTools().catch(console.error);