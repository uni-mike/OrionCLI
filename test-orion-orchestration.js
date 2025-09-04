#!/usr/bin/env node

// Test orchestration through OrionCLI
const { spawn } = require('child_process');
const colors = require('./src/utils/colors');
const fs = require('fs');

const testPrompt = `1. Create directory mega-test
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
  console.log(colors.primary('🚀 Testing Orchestration in OrionCLI\n'));
  
  // Clean up
  if (fs.existsSync('mega-test')) {
    require('child_process').execSync('rm -rf mega-test');
  }
  
  // Start OrionCLI
  const orion = spawn('node', ['orion.js'], {
    env: { ...process.env, DEBUG_TOOLS: '1', DEBUG_INPUT: '1' }
  });
  
  let output = '';
  let completedSteps = 0;
  let megaDetected = false;
  
  orion.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    
    // Show debug output
    if (text.includes('DEBUG') || text.includes('Multi-line')) {
      console.log(colors.dim(text.trim()));
    }
    
    // Don't show full output, just key events
    if (text.includes('Mega task detected')) {
      megaDetected = true;
      console.log(colors.success('✅ Mega task detected'));
    }
    if (text.includes('Completed') && text.includes('steps')) {
      const match = text.match(/Completed (\d+) steps/);
      if (match) {
        completedSteps = parseInt(match[1]);
        console.log(colors.info(`📊 Completed ${completedSteps} steps`));
      }
    }
    if (text.includes('Step') && text.includes('completed')) {
      process.stdout.write('.');
    }
  });
  
  orion.stderr.on('data', (data) => {
    // Log errors
    if (data.toString().includes('error')) {
      console.log(colors.error('Error:', data.toString()));
    }
  });
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Send the test prompt as single-line (how users would actually send it)
  console.log(colors.dim('Sending 25-step prompt as single line...'));
  
  // Combine into single line  
  const singleLinePrompt = 'Execute the following 25 numbered operations: ' + 
    testPrompt.split('\n').join(' ');
  
  // Send as single line
  orion.stdin.write(singleLinePrompt);
  
  // Send Enter to process
  await new Promise(resolve => setTimeout(resolve, 500));
  orion.stdin.write('\r');
  
  // Wait for processing
  console.log(colors.dim('\nProcessing...'));
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  // Kill OrionCLI
  orion.kill();
  
  // Check results
  console.log(colors.primary('\n\n📊 RESULTS\n'));
  
  if (megaDetected) {
    console.log(colors.success('✅ Orchestration triggered'));
  } else {
    console.log(colors.error('❌ Orchestration not triggered'));
  }
  
  console.log(`Steps completed: ${completedSteps}/25`);
  
  // Check actual files created
  if (fs.existsSync('mega-test')) {
    const fileCount = require('child_process')
      .execSync('find mega-test -type f 2>/dev/null | wc -l')
      .toString()
      .trim();
    console.log(`Files created: ${fileCount}`);
    
    // List what was created
    console.log('\nCreated structure:');
    try {
      const tree = require('child_process').execSync('tree mega-test -L 2').toString();
      console.log(colors.dim(tree));
    } catch (e) {
      const files = require('child_process').execSync('ls -la mega-test/').toString();
      console.log(colors.dim(files));
    }
  } else {
    console.log(colors.error('❌ mega-test directory not created'));
  }
  
  // Analysis
  console.log(colors.primary('\n🔍 ANALYSIS\n'));
  
  if (completedSteps === 25) {
    console.log(colors.success('✅ All 25 steps completed successfully!'));
  } else if (completedSteps > 0) {
    console.log(colors.warning(`⚠️ Only ${completedSteps}/25 steps completed`));
    
    // Try to understand why
    if (output.includes('errors')) {
      console.log('Found errors in output - tools may have failed');
    }
    if (output.includes('Orchestration failed')) {
      console.log('Orchestration failed and fell back to regular execution');
    }
  } else {
    console.log(colors.error('❌ No steps completed - orchestration failed'));
  }
  
  // Clean up
  if (fs.existsSync('mega-test')) {
    require('child_process').execSync('rm -rf mega-test');
    console.log(colors.dim('\nCleaned up mega-test directory'));
  }
  
  process.exit(completedSteps === 25 ? 0 : 1);
}

test().catch(console.error);