#!/bin/bash

echo "Testing OrionCLI with Debug Output"
echo "==================================="

# Create test file
echo "This is test content for debugging OrionCLI tool execution." > debug-test.txt

# Run with debug enabled
echo -e "What is debug-test.txt about?\nexit" | DEBUG_TOOLS=1 node orion.js 2>&1 | grep -E "(DEBUG|tool|read_file|🔧|test content)" | head -20

# Clean up
rm -f debug-test.txt

echo -e "\nDebug test completed!"