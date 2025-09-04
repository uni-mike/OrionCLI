#!/bin/bash

# Minimal test for OrionCLI
echo "Testing OrionCLI with simple command..."

# Run with debug enabled
DEBUG_TOOLS=1 node orion.js << 'EOF' 2>&1 | tee test-output.log &
PID=$!

# Wait for initialization
sleep 3

# Send command
echo "create test.txt with hello world"

# Wait for processing
sleep 5

# Kill the process
kill $PID 2>/dev/null

echo ""
echo "=== Checking Results ==="
echo ""

# Check if file was created
if [ -f test.txt ]; then
    echo "✅ test.txt was created"
    cat test.txt
    rm test.txt
else
    echo "❌ test.txt was NOT created"
fi

echo ""
echo "=== Checking for errors in log ==="
grep -i "error" test-output.log || echo "No errors found"

echo ""
echo "=== Checking for tool calls ==="
grep -i "tool" test-output.log | head -10

EOF