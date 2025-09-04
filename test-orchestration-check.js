#!/usr/bin/env node

const AdaptiveOrchestrator = require('./src/intelligence/adaptive-orchestrator');

const orchestrator = new AdaptiveOrchestrator();

const testInputs = [
  'Create a file called test.txt',
  'Execute these 25 operations in order: 1. Create directory...',
  '1. Create dir 2. Write file 3. Edit file 4. Delete file 5. Create another 6. More 7. Even more 8. Keep going 9. Almost there 10. Final one',
  'Create comprehensive analysis with 30 different steps',
  'Simple task'
];

console.log('Testing orchestration detection:\n');

testInputs.forEach(input => {
  const needs = orchestrator.needsOrchestration(input);
  console.log(`Input: "${input.substring(0, 60)}..."`);
  console.log(`Needs orchestration: ${needs ? '✅ YES' : '❌ NO'}\n`);
});