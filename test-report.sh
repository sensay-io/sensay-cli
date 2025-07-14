#!/bin/bash
# Test script for report command

# Use environment variable for API key if available
if [ -z "$SENSAY_API_KEY" ]; then
  echo "Please set SENSAY_API_KEY environment variable"
  exit 1
fi

echo "Testing report command with verbose output..."
npm run dev -- report --apikey "$SENSAY_API_KEY" -vv --silent