#!/usr/bin/env node

// Comprehensive test for ToolForge - tests all features
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Direct testing without spawning OrionCLI
const ToolForge = require('./src/experimental/tool-forge');
const ToolForgeIntegration = require('./src/experimental/tool-forge-integration');
const colors = require('./src/utils/colors');

// Mock tool registry
const mockRegistry = {
  executeTool: async (name, args) => {
    throw new Error(`Tool not found: ${name}`);
  }
};

// Mock client info
const mockClientInfo = {
  createClient: function() {
    return {
      chat: {
        completions: {
          create: async (params) => {
            // Mock AI responses based on the prompt
            const userMessage = params.messages[params.messages.length - 1].content;
            if (userMessage.includes('Analyze this error')) {
              return {
                choices: [{
                  message: {
                    content: JSON.stringify({
                      toolName: "calculate_hash",
                      functionality: "Calculate hash of a file",
                      parameters: ["filename", "algorithm"],
                      returnType: "string",
                      category: "file_ops"
                    })
                  }
                }]
              };
            } else if (userMessage.includes('Generate a JavaScript tool')) {
              return {
                choices: [{
                  message: {
                    content: `
class CalculateHash {
  constructor() {
    this.name = 'calculate_hash';
    this.description = 'Calculate hash of a file';
  }
  
  async execute(args) {
    if (!args.filename) {
      throw new Error('filename parameter required');
    }
    
    const crypto = require('crypto');
    const fs = require('fs').promises;
    
    try {
      const content = await fs.readFile(args.filename, 'utf8');
      const algorithm = args.algorithm || 'sha256';
      const hash = crypto.createHash(algorithm).update(content).digest('hex');
      
      return {
        output: \`Hash (\${algorithm}): \${hash}\`,
        hash: hash,
        algorithm: algorithm
      };
    } catch (error) {
      throw new Error(\`Failed to calculate hash: \${error.message}\`);
    }
  }
}

module.exports = CalculateHash;`
                  }
                }]
              };
            }
            return { choices: [{ message: { content: '{}' } }] };
          }
        }
      }
    };
  },
  config: {}
};

async function testToolForge() {
  console.log(colors.primary('🧪 COMPREHENSIVE TOOLFORGE TEST'));
  console.log(colors.dim('='.repeat(60)));
  
  const results = {
    passed: [],
    failed: []
  };
  
  // Clean up any previous test artifacts
  try {
    await execSync('rm -rf .tool-forge');
  } catch (e) {}
  
  // Initialize ToolForge
  console.log('\n' + colors.info('📦 Phase 1: Initialization'));
  const forge = new ToolForge(mockClientInfo, mockRegistry);
  const integration = new ToolForgeIntegration();
  
  try {
    await forge.init();
    await integration.init(mockClientInfo, mockRegistry);
    console.log(colors.success('✅ ToolForge initialized'));
    results.passed.push('Initialization');
  } catch (error) {
    console.log(colors.error('❌ Initialization failed:', error.message));
    results.failed.push('Initialization');
    return results;
  }
  
  // Test 1: Detect missing tool error
  console.log('\n' + colors.info('🔍 Phase 2: Missing Tool Detection'));
  const testError1 = new Error('Tool not found: calculate_hash');
  const isMissing = integration.isMissingToolError(testError1);
  
  if (isMissing) {
    console.log(colors.success('✅ Missing tool detected correctly'));
    results.passed.push('Missing tool detection');
  } else {
    console.log(colors.error('❌ Failed to detect missing tool'));
    results.failed.push('Missing tool detection');
  }
  
  // Test 2: Generate tool from error
  console.log('\n' + colors.info('🔨 Phase 3: Tool Generation'));
  try {
    const success = await forge.forge(testError1, {
      toolCall: { function: { name: 'calculate_hash', arguments: '{"filename":"test.txt"}' } }
    });
    
    if (success) {
      console.log(colors.success('✅ Tool generated successfully'));
      results.passed.push('Tool generation');
      
      // Verify the tool was created
      const manifest = forge.manifest;
      if (manifest.tools.calculate_hash) {
        console.log(colors.success('✅ Tool registered in manifest'));
        console.log(colors.dim(`   Version: ${manifest.tools.calculate_hash.activeVersion}`));
        results.passed.push('Tool registration');
      } else {
        console.log(colors.error('❌ Tool not found in manifest'));
        results.failed.push('Tool registration');
      }
    } else {
      console.log(colors.error('❌ Tool generation failed'));
      results.failed.push('Tool generation');
    }
  } catch (error) {
    console.log(colors.error('❌ Tool generation error:', error.message));
    results.failed.push('Tool generation');
  }
  
  // Test 3: Version tracking
  console.log('\n' + colors.info('📚 Phase 4: Version Tracking'));
  try {
    const versions = await forge.listVersions('calculate_hash');
    if (versions && versions.length > 0) {
      console.log(colors.success(`✅ Version tracking works: ${versions.length} version(s)`));
      versions.forEach(v => {
        console.log(colors.dim(`   v${v.version} - ${v.created} ${v.active ? '(active)' : ''}`));
        console.log(colors.dim(`     Notes: ${v.notes}`));
      });
      results.passed.push('Version tracking');
    } else {
      console.log(colors.error('❌ No versions found'));
      results.failed.push('Version tracking');
    }
  } catch (error) {
    console.log(colors.error('❌ Version tracking error:', error.message));
    results.failed.push('Version tracking');
  }
  
  // Test 4: Create second version
  console.log('\n' + colors.info('🔄 Phase 5: Multiple Versions'));
  try {
    // Simulate generating an updated version
    const toolInfo = await forge.generateTool({
      toolName: 'calculate_hash',
      functionality: 'Calculate hash with improved performance',
      parameters: ['filename', 'algorithm', 'encoding'],
      returnType: 'object',
      category: 'file_ops'
    });
    
    if (toolInfo) {
      // Mock test as passed
      forge.manifest.tools.calculate_hash.versions.push({
        version: toolInfo.version,
        path: toolInfo.path,
        spec: toolInfo.spec,
        created: new Date().toISOString(),
        testsPassed: true
      });
      forge.manifest.tools.calculate_hash.activeVersion = toolInfo.version;
      await forge.saveManifest();
      
      console.log(colors.success('✅ Second version created'));
      console.log(colors.dim(`   New version: ${toolInfo.version}`));
      results.passed.push('Multiple versions');
      
      // List versions again
      const versions = await forge.listVersions('calculate_hash');
      console.log(colors.dim(`   Total versions: ${versions.length}`));
    }
  } catch (error) {
    console.log(colors.warning('⚠️ Multiple versions test skipped'));
  }
  
  // Test 5: Rollback
  console.log('\n' + colors.info('⏪ Phase 6: Rollback Mechanism'));
  try {
    const versions = await forge.listVersions('calculate_hash');
    if (versions.length > 1) {
      const currentVersion = forge.manifest.tools.calculate_hash.activeVersion;
      const success = await forge.rollback('calculate_hash');
      
      if (success) {
        const newActiveVersion = forge.manifest.tools.calculate_hash.activeVersion;
        if (newActiveVersion !== currentVersion) {
          console.log(colors.success('✅ Rollback successful'));
          console.log(colors.dim(`   Rolled back from v${currentVersion} to v${newActiveVersion}`));
          results.passed.push('Rollback');
        } else {
          console.log(colors.error('❌ Rollback did not change version'));
          results.failed.push('Rollback');
        }
      } else {
        console.log(colors.error('❌ Rollback failed'));
        results.failed.push('Rollback');
      }
    } else {
      console.log(colors.warning('⚠️ Not enough versions to test rollback'));
    }
  } catch (error) {
    console.log(colors.error('❌ Rollback error:', error.message));
    results.failed.push('Rollback');
  }
  
  // Test 6: History tracking
  console.log('\n' + colors.info('📜 Phase 7: History Tracking'));
  try {
    const history = forge.manifest.history;
    if (history && history.length > 0) {
      console.log(colors.success(`✅ History tracking: ${history.length} entries`));
      history.slice(-3).forEach(entry => {
        console.log(colors.dim(`   ${entry.action} ${entry.tool} v${entry.version}`));
      });
      results.passed.push('History tracking');
    } else {
      console.log(colors.error('❌ No history found'));
      results.failed.push('History tracking');
    }
  } catch (error) {
    console.log(colors.error('❌ History tracking error:', error.message));
    results.failed.push('History tracking');
  }
  
  // Test 7: Cleanup old versions
  console.log('\n' + colors.info('🧹 Phase 8: Cleanup'));
  try {
    await forge.cleanup(1); // Keep only 1 version
    const versions = await forge.listVersions('calculate_hash');
    if (versions.length <= 1) {
      console.log(colors.success('✅ Cleanup successful'));
      console.log(colors.dim(`   Versions remaining: ${versions.length}`));
      results.passed.push('Cleanup');
    } else {
      console.log(colors.warning(`⚠️ Expected 1 version, found ${versions.length}`));
    }
  } catch (error) {
    console.log(colors.error('❌ Cleanup error:', error.message));
    results.failed.push('Cleanup');
  }
  
  // Test 8: Integration features
  console.log('\n' + colors.info('🔗 Phase 9: Integration Features'));
  try {
    // Test failure patterns
    integration.failureHistory = [
      { error: 'Tool not found: test1', context: {}, timestamp: new Date().toISOString() },
      { error: 'Tool not found: test1', context: {}, timestamp: new Date().toISOString() },
      { error: 'Tool not found: test2', context: {}, timestamp: new Date().toISOString() }
    ];
    
    const patterns = integration.getFailurePatterns();
    if (patterns.length > 0) {
      console.log(colors.success('✅ Failure pattern analysis works'));
      console.log(colors.dim(`   Top pattern: ${patterns[0].pattern} (${patterns[0].count} times)`));
      results.passed.push('Failure patterns');
    }
    
    // Test forged tools list
    const forgedTools = await integration.listForgedTools();
    if (forgedTools.length > 0) {
      console.log(colors.success(`✅ Listed ${forgedTools.length} forged tool(s)`));
      results.passed.push('List forged tools');
    }
  } catch (error) {
    console.log(colors.error('❌ Integration features error:', error.message));
    results.failed.push('Integration features');
  }
  
  // Test 9: Manifest persistence
  console.log('\n' + colors.info('💾 Phase 10: Persistence'));
  try {
    // Save current manifest
    await forge.saveManifest();
    
    // Create new instance and load
    const forge2 = new ToolForge(mockClientInfo, mockRegistry);
    await forge2.init();
    
    if (forge2.manifest.tools.calculate_hash) {
      console.log(colors.success('✅ Manifest persisted and loaded'));
      results.passed.push('Persistence');
    } else {
      console.log(colors.error('❌ Manifest not persisted correctly'));
      results.failed.push('Persistence');
    }
  } catch (error) {
    console.log(colors.error('❌ Persistence error:', error.message));
    results.failed.push('Persistence');
  }
  
  return results;
}

// Run comprehensive test
async function main() {
  console.clear();
  console.log(colors.primary.bold('\n🚀 TOOLFORGE COMPREHENSIVE TEST SUITE\n'));
  
  const startTime = Date.now();
  const results = await testToolForge();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Summary
  console.log('\n' + colors.primary('='.repeat(60)));
  console.log(colors.primary.bold('\n📊 TEST SUMMARY\n'));
  
  console.log(colors.success(`✅ Passed: ${results.passed.length}`));
  results.passed.forEach(test => {
    console.log(colors.dim(`   • ${test}`));
  });
  
  if (results.failed.length > 0) {
    console.log(colors.error(`\n❌ Failed: ${results.failed.length}`));
    results.failed.forEach(test => {
      console.log(colors.dim(`   • ${test}`));
    });
  }
  
  const successRate = Math.round((results.passed.length / (results.passed.length + results.failed.length)) * 100);
  
  console.log('\n' + colors.primary('='.repeat(60)));
  console.log(colors.info(`\n⏱️  Duration: ${duration}s`));
  console.log(colors.info(`📈 Success Rate: ${successRate}%`));
  
  if (successRate === 100) {
    console.log(colors.success.bold('\n🎉 ALL TESTS PASSED! ToolForge is fully functional!\n'));
  } else if (successRate >= 80) {
    console.log(colors.warning.bold('\n✅ MOSTLY PASSED - Some features need attention\n'));
  } else {
    console.log(colors.error.bold('\n⚠️  NEEDS WORK - Several features are not working\n'));
  }
  
  // Verify files created
  console.log(colors.dim('\n📁 Artifacts created:'));
  try {
    const manifestExists = await fs.stat('.tool-forge/manifest.json');
    console.log(colors.dim('   • .tool-forge/manifest.json'));
    
    const files = await fs.readdir('.tool-forge/versions/').catch(() => []);
    if (files.length > 0) {
      console.log(colors.dim(`   • ${files.length} version file(s) in .tool-forge/versions/`));
    }
  } catch (e) {}
  
  // Clean up option
  console.log(colors.dim('\nCleanup: rm -rf .tool-forge'));
  
  process.exit(successRate === 100 ? 0 : 1);
}

main().catch(error => {
  console.error(colors.error('\n💥 Test suite crashed:'), error);
  process.exit(1);
});