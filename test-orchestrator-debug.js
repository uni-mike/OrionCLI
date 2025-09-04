#!/usr/bin/env node

// Debug test for SimpleOrchestrator
const SimpleOrchestrator = require('./src/intelligence/simple-orchestrator');
const colors = require('./src/utils/colors');

const orchestrator = new SimpleOrchestrator();

// Test input with 25 numbered steps
const testInput = `Execute the following 25 numbered operations:
1. Create directory mega-test
2. Create file mega-test/README.md with "# Mega Test"
3. Create directory mega-test/src
4. Create file mega-test/src/index.js with "console.log('hello');"
5. Create directory mega-test/docs
6. Create file mega-test/docs/guide.md with "Guide"
7. Create file mega-test/config.json with {"test": true}
8. Create directory mega-test/data
9. Create file mega-test/data/sample.txt with "data"
10. Create file mega-test/package.json with {"name": "test"}
11. Create directory mega-test/tests
12. Create file mega-test/tests/test.js with "// tests"
13. List files in mega-test
14. Create file mega-test/output.txt with "output"
15. Create directory mega-test/logs
16. Create file mega-test/logs/app.log with "log entry"
17. Read file mega-test/README.md
18. Create file mega-test/.env with "DEBUG=true"
19. Create directory mega-test/public
20. Create file mega-test/public/index.html with "<h1>Test</h1>"
21. Execute bash command: ls -la mega-test/
22. Create file mega-test/Dockerfile with "FROM node:18"
23. Count total files in mega-test
24. Create file mega-test/SUMMARY.md with "# Summary"
25. Execute bash command: find mega-test -type f | wc -l`;

async function test() {
  console.log(colors.primary('🧪 Testing SimpleOrchestrator\n'));
  
  // Test 1: Check if it detects orchestration need
  const needsOrch = orchestrator.needsOrchestration(testInput);
  console.log(`Needs orchestration: ${needsOrch ? '✅ YES' : '❌ NO'}`);
  
  // Test 2: Parse steps
  console.log('\n📋 Parsing steps...');
  const steps = orchestrator.parseSteps(testInput);
  console.log(`Found ${steps.length} steps\n`);
  
  if (steps.length === 0) {
    console.log(colors.error('❌ No steps parsed! There is a bug in parseSteps()'));
    
    // Debug: Try to understand why
    const lines = testInput.split('\n');
    console.log(`\nTotal lines: ${lines.length}`);
    
    let matches = 0;
    lines.forEach(line => {
      const match = line.match(/^(\d+)\.\s+(.+)/);
      if (match) {
        matches++;
        console.log(colors.dim(`  Match: ${match[1]}. ${match[2].substring(0, 50)}...`));
      }
    });
    
    console.log(`\nRegex matched ${matches} lines`);
    return;
  }
  
  // Show parsed steps
  steps.slice(0, 5).forEach(step => {
    console.log(colors.dim(`  ${step.number}. ${step.action} -> ${step.target || 'N/A'}`));
  });
  
  if (steps.length > 5) {
    console.log(colors.dim(`  ... and ${steps.length - 5} more`));
  }
  
  // Test 3: Test execution (mock)
  console.log('\n🎬 Testing execution logic...');
  
  let executedCount = 0;
  const mockExecutor = async (toolJson) => {
    const tool = JSON.parse(toolJson);
    executedCount++;
    console.log(colors.dim(`  Executed: ${tool.tool} ${tool.args.filename || tool.args.command || tool.args.path || ''}`));
    return true;
  };
  
  // Clean up any existing mega-test
  const fs = require('fs');
  if (fs.existsSync('mega-test')) {
    require('child_process').execSync('rm -rf mega-test');
  }
  
  // Execute orchestration
  console.log('\n🚀 Running orchestration...');
  const result = await orchestrator.orchestrate(
    testInput,
    { client: {}, config: {}, createClient: () => ({}) },
    'test prompt',
    mockExecutor
  );
  
  console.log('\n📊 Results:');
  console.log(`  Completed: ${result.completedSteps}`);
  console.log(`  Errors: ${result.errors}`);
  console.log(`  Success: ${result.success ? '✅' : '❌'}`);
  console.log(`  Tools executed: ${executedCount}`);
  
  // Check actual files created
  if (fs.existsSync('mega-test')) {
    const files = require('child_process').execSync('find mega-test -type f 2>/dev/null | wc -l').toString().trim();
    console.log(`  Actual files created: ${files}`);
    
    // Clean up
    require('child_process').execSync('rm -rf mega-test');
  }
  
  // Identify issues
  console.log('\n🔍 Analysis:');
  if (steps.length < 25) {
    console.log(colors.error(`❌ Only ${steps.length}/25 steps parsed`));
  }
  if (result.completedSteps < 25) {
    console.log(colors.error(`❌ Only ${result.completedSteps}/25 steps completed`));
  }
  if (executedCount < 25) {
    console.log(colors.error(`❌ Only ${executedCount} tools executed`));
  }
  
  if (steps.length === 25 && result.completedSteps === 25) {
    console.log(colors.success('✅ All 25 steps parsed and executed successfully!'));
  }
}

test().catch(console.error);