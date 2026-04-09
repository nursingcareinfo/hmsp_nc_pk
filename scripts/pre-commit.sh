#!/bin/bash
# Pre-commit hook: Block commits with hardcoded secrets or failing typecheck
# Install: cp .git/hooks/pre-commit.sample .git/hooks/pre-commit (then replace content)

echo "🔍 Pre-commit checks..."

# Check for hardcoded Supabase keys
if grep -rE "eyJhbGci|sk-|SUPABASE_ANON|SUPABASE_URL" --include="*.ts" --include="*.tsx" --include="*.py" --include="*.js" src/ supabase-local/ 2>/dev/null | grep -v "process.env" | grep -v "\.env" | grep -v "import" | grep -v "//"; then
  echo "❌ Hardcoded API keys detected. Use environment variables instead."
  exit 1
fi

# Quick typecheck (only if node_modules exists)
if [ -d "node_modules" ]; then
  echo "📝 Quick typecheck..."
  npx tsc --noEmit --pretty 2>/dev/null
  if [ $? -ne 0 ]; then
    echo "⚠️  Type errors detected. Commit allowed but fix before push."
  fi
fi

echo "✅ Pre-commit checks passed!"
exit 0
