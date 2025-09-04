#!/usr/bin/env node

// Direct test bypassing the CLI interface
const AdaptiveOrchestrator = require('./src/intelligence/adaptive-orchestrator');
const fs = require('fs');

async function test() {
  console.log('Testing direct orchestration...\n');
  
  const orchestrator = new AdaptiveOrchestrator();
  
  const megaTask = `Execute these 25 operations in order:
1. Create directory mega-test/
2. Create mega-test/README.md with "# Mega Test Project"
3. Create mega-test/docs/ directory
4. Create mega-test/docs/guide.md with "User Guide"
5. Create mega-test/docs/api.md with "API Documentation"`;
  
  console.log('Input:', megaTask.substring(0, 100) + '...\n');
  
  const needsOrch = orchestrator.needsOrchestration(megaTask);
  console.log('Needs orchestration:', needsOrch ? '✅ YES' : '❌ NO');
  
  if (needsOrch) {
    console.log('\n✅ Orchestration would be triggered!');
    console.log('Would use:');
    console.log('- o3 for planning');
    console.log('- gpt-5-chat for file operations');
    console.log('- Adaptive feedback loops');
  } else {
    console.log('\n❌ Orchestration NOT triggered - this is a problem!');
  }
}

test().catch(console.error);