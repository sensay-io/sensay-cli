#!/bin/bash

set -e

echo "🔄 Generating Sensay SDK..."

# Create generated directory
mkdir -p src/generated

# Download OpenAPI schema
echo "📥 Downloading OpenAPI schema..."
curl -s https://api.sensay.io/schema > src/generated/schema.json
echo "✅ Schema downloaded successfully"

# Generate TypeScript client using openapi-typescript-codegen
echo "🔧 Generating TypeScript client..."
npx openapi-typescript-codegen \
  --input src/generated/schema.json \
  --output src/generated \
  --client fetch

echo "✅ TypeScript client generated"

echo "🎉 SDK generation complete!"