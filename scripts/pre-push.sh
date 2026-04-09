#!/bin/bash
# Pre-push validation script
# Runs typecheck and build before allowing push
# Usage: Add to .git/hooks/pre-push or run manually with `npm run pre-push`

set -e

echo "🔍 Running pre-push validation..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules not found. Running npm install..."
  npm install
fi

# Type check
echo "📝 Running TypeScript type check..."
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ Type check failed. Fix errors before pushing."
  exit 1
fi

# Build check
echo "🔨 Running production build..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Fix errors before pushing."
  exit 1
fi

# Check for console.log in src/
echo "🔎 Checking for console.log statements..."
CONSOLE_LOGS=$(grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)
if [ -n "$CONSOLE_LOGS" ]; then
  echo "⚠️  Found console.log statements:"
  echo "$CONSOLE_LOGS"
  echo "Remove or replace with proper logging before pushing."
  exit 1
fi

# Check for hardcoded secrets
echo "🔒 Checking for hardcoded secrets..."
SECRETS=$(grep -rE "(SUPABASE_ANON|SUPABASE_URL|GEMINI_API_KEY).*['\"]" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "process.env" | grep -v "\.env" || true)
if [ -n "$SECRETS" ]; then
  echo "❌ Found hardcoded secrets:"
  echo "$SECRETS"
  echo "Use environment variables instead."
  exit 1
fi

echo "✅ All pre-push checks passed!"
exit 0
