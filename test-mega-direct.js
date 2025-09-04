#!/usr/bin/env node

// Direct test of processWithAI with mega task
require('dotenv').config();

const OrionCLI = require('./orion');

async function test() {
  console.log('Direct test of mega task processing...\n');
  
  const cli = new OrionCLI();
  
  const megaTask = `Execute these 25 operations in order:
1. Create directory mega-test/
2. Create mega-test/README.md with "# Mega Test Project"
3. Create mega-test/docs/ directory
4. Create mega-test/docs/guide.md with "User Guide"
5. Create mega-test/docs/api.md with "API Documentation"
6. Create mega-test/src/ directory
7. Create mega-test/src/index.js with "console.log('Hello');"
8. Create mega-test/src/utils.js with "exports.helper = () => true;"
9. Create mega-test/tests/ directory
10. Create mega-test/tests/test.js with "// Unit tests"
11. Create mega-test/config.json with {"name": "mega-test", "version": "1.0"}
12. Create mega-test/package.json with {"name": "mega-test", "main": "src/index.js"}
13. List files in mega-test/ directory
14. Read mega-test/README.md
15. Create mega-test/data/ directory
16. Create mega-test/data/sample.txt with "Sample data"
17. Execute bash command: echo "Test" > mega-test/output.txt
18. List all .js files using bash: find mega-test -name "*.js"
19. Get word count of all files: wc -l mega-test/**/*
20. Create mega-test/.gitignore with "node_modules/"
21. Create mega-test/Dockerfile with "FROM node:18"
22. Create mega-test/build/ directory
23. Create mega-test/build/info.txt with build date using: date > mega-test/build/info.txt
24. Create mega-test/SUMMARY.md listing all created items
25. Finally, count total files created with: find mega-test -type f | wc -l`;
  
  console.log('Calling processWithAI directly...\n');
  
  // Set a timeout to prevent hanging
  const timeout = setTimeout(() => {
    console.log('\nTimeout reached - checking results...');
    process.exit(0);
  }, 15000);
  
  try {
    await cli.processWithAI(megaTask);
    console.log('\nProcessing complete!');
    clearTimeout(timeout);
  } catch (error) {
    console.error('Error:', error);
    clearTimeout(timeout);
  }
  
  // Check results
  const fs = require('fs');
  if (fs.existsSync('mega-test')) {
    console.log('✅ mega-test directory was created!');
    const { execSync } = require('child_process');
    const fileCount = execSync('find mega-test -type f | wc -l').toString().trim();
    console.log(`Files created: ${fileCount}`);
    
    // Clean up
    execSync('rm -rf mega-test');
  } else {
    console.log('❌ mega-test directory was NOT created');
  }
  
  process.exit(0);
}

// Set debug mode
process.env.DEBUG_TOOLS = '1';

test().catch(console.error);