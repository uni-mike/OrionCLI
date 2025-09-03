#!/bin/bash

# Development runner for OrionCLI
# Runs the simple version while we fix the full TypeScript build

echo "🚀 Starting OrionCLI in development mode..."
echo ""

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check for API keys
if [ -z "$ORION_DEFAULT_KEY" ] && [ -z "$AZURE_OPENAI_KEY" ]; then
    echo "⚠️  Warning: No Azure API keys found in .env file"
    echo "   Please set ORION_DEFAULT_KEY in your .env file"
    echo ""
fi

# For now, run the simple JavaScript version from _OLD
if [ -f "_OLD/orion-cli.js" ]; then
    node _OLD/orion-cli.js "$@"
else
    echo "❌ Error: orion-cli.js not found"
    echo "   The TypeScript build needs to be fixed first"
    echo ""
    echo "As a fallback, you can use the orion wrapper script:"
    echo "  ./orion"
fi