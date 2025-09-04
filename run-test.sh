#!/bin/bash

echo "Running test with debug..."
DEBUG_TOOLS=1 node test-simple.js 2>&1 | tee full-test.log

echo ""
echo "=== Checking for processing ==="
grep "Processing input" full-test.log || echo "No 'Processing input' found"

echo ""
echo "=== Checking for errors ==="
grep -i "error" full-test.log | head -5 || echo "No errors found"

echo ""
echo "=== Last 20 lines of log ==="
tail -20 full-test.log