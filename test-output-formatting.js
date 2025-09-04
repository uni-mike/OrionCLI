#!/usr/bin/env node

// Test the smart output formatting in OrionCLI
const colors = require('./src/utils/colors');

console.log(colors.primary('═'.repeat(60)));
console.log(colors.primary.bold('🎨 Testing Smart Output Formatting'));
console.log(colors.primary('═'.repeat(60)));

// Import OrionCLI to test the formatLongOutput method
const OrionCLI = require('./orion.js');

// Create a test instance (we'll test the method directly)
class TestFormatter {
  formatLongOutput(output) {
    // Copy of the formatLongOutput method from orion.js
    if (!output || typeof output !== 'string') return output;
    
    const lines = output.split('\n');
    const lineCount = lines.length;
    
    // For outputs with many lines (> 20), show first 5 and summary
    if (lineCount > 20) {
      const firstLines = lines.slice(0, 5).join('\n');
      const remainingCount = lineCount - 5;
      const lastLine = lines[lineCount - 1];
      
      // Include the last line if it's a summary (like "total" in wc)
      const showLast = lastLine && (
        lastLine.includes('total') || 
        lastLine.includes('Total') || 
        lastLine.includes('files') ||
        lastLine.includes('directories')
      );
      
      let formatted = firstLines + '\n' + colors.dim(`\n... ${remainingCount} more lines ...`);
      
      if (showLast && lastLine.trim()) {
        formatted += '\n' + colors.accent(lastLine);
      }
      
      return formatted;
    }
    
    // For very long single lines (> 1000 chars), truncate
    if (output.length > 1000 && lineCount <= 3) {
      return output.substring(0, 500) + colors.dim('\n... truncated ...') + '\n' + output.substring(output.length - 200);
    }
    
    return output;
  }
}

const formatter = new TestFormatter();

// Test 1: Many lines output (like ls -la)
console.log('\n' + colors.warning('Test 1: Many Lines (like ls -la output)'));
const manyLinesOutput = Array.from({length: 50}, (_, i) => 
  `-rw-r--r--  1 user  staff  ${1000 + i} Sep  4 10:00 file${i}.txt`
).join('\n') + '\n50 files, 125000 total';

const formatted1 = formatter.formatLongOutput(manyLinesOutput);
console.log(colors.dim('Original: 51 lines'));
console.log('Formatted output:');
console.log(formatted1);

// Test 2: Very long single line
console.log('\n' + colors.warning('Test 2: Very Long Single Line'));
const longLine = 'A'.repeat(1500);
const formatted2 = formatter.formatLongOutput(longLine);
console.log(colors.dim(`Original: ${longLine.length} characters`));
console.log('Formatted output:');
console.log(formatted2);

// Test 3: Moderate output (under 20 lines - should not be formatted)
console.log('\n' + colors.warning('Test 3: Moderate Output (15 lines)'));
const moderateOutput = Array.from({length: 15}, (_, i) => `Line ${i + 1}: Some content here`).join('\n');
const formatted3 = formatter.formatLongOutput(moderateOutput);
console.log(colors.dim('Original: 15 lines'));
console.log('Formatted output (should be unchanged):');
console.log(formatted3);

// Test 4: Output with "total" summary line
console.log('\n' + colors.warning('Test 4: Output with Summary Line (wc style)'));
const wcOutput = Array.from({length: 30}, (_, i) => 
  `     ${100 + i} src/file${i}.js`
).join('\n') + '\n    3500 total';

const formatted4 = formatter.formatLongOutput(wcOutput);
console.log(colors.dim('Original: 31 lines with "total" at end'));
console.log('Formatted output:');
console.log(formatted4);

// Test 5: Real command simulation
console.log('\n' + colors.warning('Test 5: Real Command Output Simulation'));
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

(async () => {
  try {
    // Generate a real directory listing
    const result = await execAsync('find . -name "*.js" -type f | head -30');
    const formatted5 = formatter.formatLongOutput(result.stdout);
    
    console.log(colors.dim(`Original: ${result.stdout.split('\n').length} lines`));
    console.log('Formatted output:');
    console.log(formatted5);
  } catch (error) {
    console.log(colors.error('Could not run find command'));
  }
  
  // Summary
  console.log('\n' + colors.primary('═'.repeat(60)));
  console.log(colors.primary.bold('📊 Format Summary'));
  console.log(colors.primary('═'.repeat(60)));
  
  console.log(colors.success('\n✅ Smart Formatting Rules:'));
  console.log(colors.dim('  • > 20 lines: Show first 5 + "... X more lines ..." + summary if exists'));
  console.log(colors.dim('  • > 1000 chars (single line): Show first 500 + "... truncated ..." + last 200'));
  console.log(colors.dim('  • ≤ 20 lines: Show all (no formatting)'));
  console.log(colors.dim('  • Summary lines with "total", "Total", "files", "directories" are preserved'));
  
  console.log('\n' + colors.info('💡 Benefits:'));
  console.log(colors.accent('• Cleaner terminal output'));
  console.log(colors.accent('• Important information preserved (first/last lines)'));
  console.log(colors.accent('• Summary lines always visible'));
  console.log(colors.accent('• Less scrolling for long outputs'));
})();