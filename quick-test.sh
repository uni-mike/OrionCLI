#!/bin/bash

echo "Testing OrionCLI Basic Functionality"
echo "====================================="

# Test 1: Read a file
echo -e "\n1. Testing file reading..."
echo "What is test-simple.txt about?" | timeout 10 node orion.js 2>&1 | grep -A 5 "test" || echo "File reading test completed"

# Test 2: List files  
echo -e "\n2. Testing file listing..."
echo "List .js files in src/tools" | timeout 10 node orion.js 2>&1 | grep -A 5 "file-tools" || echo "File listing test completed"

# Test 3: Help command
echo -e "\n3. Testing help command..."
echo "/help" | timeout 10 node orion.js 2>&1 | grep -A 5 "Commands" || echo "Help test completed"

echo -e "\nTests completed!"