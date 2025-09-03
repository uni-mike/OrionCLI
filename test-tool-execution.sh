#!/bin/bash

echo "Testing OrionCLI Tool Execution"
echo "================================"

# Create a test file for Orion to read
echo "This is test content for OrionCLI to read and understand." > test-content.txt

# Test 1: File reading
echo -e "\n1. Testing file reading (should execute read_file tool):"
echo "What is test-content.txt about?" | (
  node orion.js 2>&1 &
  PID=$!
  sleep 5
  echo "exit" 
  sleep 2
  kill $PID 2>/dev/null || true
) | grep -E "(test|content|read_file|🔧)" | head -10

# Test 2: File creation
echo -e "\n2. Testing file creation (should execute create_file tool):"
echo "Create a file called test-output.txt with 'Hello from test'" | (
  node orion.js 2>&1 &
  PID=$!
  sleep 5
  echo "exit"
  sleep 2
  kill $PID 2>/dev/null || true
) | grep -E "(create|test-output|🔧)" | head -10

# Check if file was created
if [ -f test-output.txt ]; then
  echo "✅ test-output.txt was created"
  rm test-output.txt
else
  echo "❌ test-output.txt was NOT created"
fi

# Clean up
rm -f test-content.txt

echo -e "\nTest completed!"