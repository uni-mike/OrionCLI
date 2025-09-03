#!/usr/bin/env node
/**
 * Test script for OrionCLI functionality
 * Tests core features without requiring interactive input
 */

const { spawn } = require('child_process');
const path = require('path');

// Color output for test results
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`
};

const tests = [
  {
    name: 'Read TODO.md file',
    input: 'What is the TODO.md file about?',
    expectedPatterns: ['OrionCLI', 'Version', 'Features', 'Tools'],
    timeout: 15000
  },
  {
    name: 'List files',
    input: 'List all JavaScript files in the src/tools directory',
    expectedPatterns: ['file-tools.js', '.js'],
    timeout: 10000
  },
  {
    name: 'Search for text',
    input: 'Search for "orchestration" in the codebase',
    expectedPatterns: ['orchestration', 'found', 'file'],
    timeout: 10000
  },
  {
    name: 'Help command',
    input: '/help',
    expectedPatterns: ['Commands', 'Tools', 'OrionCLI'],
    timeout: 5000
  }
];

async function runTest(test) {
  return new Promise((resolve, reject) => {
    console.log(colors.cyan(`\nRunning test: ${test.name}`));
    console.log(colors.yellow(`Input: ${test.input}`));
    
    const orion = spawn('node', ['orion.js'], {
      cwd: path.join(__dirname),
      env: { ...process.env, NO_SPINNER: 'true' }
    });
    
    let output = '';
    let errorOutput = '';
    const timeout = setTimeout(() => {
      orion.kill();
      reject(new Error('Test timed out'));
    }, test.timeout);
    
    orion.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    orion.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Wait for initialization
    setTimeout(() => {
      orion.stdin.write(test.input + '\n');
      
      // Give time for response
      setTimeout(() => {
        orion.stdin.write('exit\n');
      }, 3000);
    }, 2000);
    
    orion.on('close', (code) => {
      clearTimeout(timeout);
      
      // Check if expected patterns are in output
      const allOutput = output + errorOutput;
      const passed = test.expectedPatterns.every(pattern => 
        allOutput.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (passed) {
        console.log(colors.green(`✅ Test passed`));
        resolve({ test: test.name, passed: true, output: allOutput });
      } else {
        console.log(colors.red(`❌ Test failed`));
        console.log('Expected patterns not found:', test.expectedPatterns);
        console.log('Output preview:', allOutput.slice(0, 500));
        resolve({ test: test.name, passed: false, output: allOutput });
      }
    });
  });
}

async function runAllTests() {
  console.log(colors.cyan('\n🧪 Starting OrionCLI Functionality Tests\n'));
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await runTest(test);
      results.push(result);
    } catch (error) {
      console.log(colors.red(`❌ Test error: ${error.message}`));
      results.push({ test: test.name, passed: false, error: error.message });
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log(colors.cyan('\n📊 Test Summary:\n'));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(r => {
    const status = r.passed ? colors.green('✅ PASS') : colors.red('❌ FAIL');
    console.log(`  ${status} - ${r.test}`);
  });
  
  console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed === 0) {
    console.log(colors.green('\n🎉 All tests passed!'));
  } else {
    console.log(colors.red(`\n⚠️  ${failed} test(s) failed`));
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);