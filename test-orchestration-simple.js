#!/usr/bin/env node

// Simple orchestration check without full CLI
const AdaptiveOrchestrator = require('./src/intelligence/adaptive-orchestrator');

const testCases = [
  {
    name: 'Simple task',
    input: 'Create a file test.txt'
  },
  {
    name: '3-step task',  
    input: 'Create dir, write file, list files'
  },
  {
    name: '10-step numbered',
    input: '1. Create dir 2. Write file 3. Edit file 4. List files 5. Read file 6. Delete file 7. Create another 8. Copy file 9. Move file 10. Check status'
  },
  {
    name: 'Mega 25 operations',
    input: 'Execute these 25 operations in order: 1. Create directory mega-test/ 2. Create mega-test/README.md'
  },
  {
    name: 'Comprehensive keyword',
    input: 'Create a comprehensive analysis with multiple files and directories including code generation and tests'
  }
];

console.log('Orchestration Detection Test\n');
console.log('=' .repeat(50));

const orchestrator = new AdaptiveOrchestrator();

testCases.forEach(test => {
  const needs = orchestrator.needsOrchestration(test.input);
  console.log(`\n${test.name}:`);
  console.log(`Input: "${test.input.substring(0, 60)}..."`);
  console.log(`Needs Orchestration: ${needs ? '✅ YES' : '❌ NO'}`);
});

console.log('\n' + '='.repeat(50));
console.log('\nExpected: Simple=NO, 3-step=NO, 10-step=YES, Mega=YES, Comprehensive=YES');