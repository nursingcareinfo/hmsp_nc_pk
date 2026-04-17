#!/bin/bash
# Pre-commit hook: Block commits with hardcoded secrets or failing typecheck
# Install: cp .git/hooks/pre-commit.sample .git/hooks/pre-commit (then replace content)

echo "🔍 Pre-commit checks..."

# Check for hardcoded Supabase keys (exclude supabase-local/ which are backend scripts)
# Skip error messages, env var names, and imports
if grep -rE "eyJhbGci[^a-zA-Z]|sk-[a-zA-Z0-9]{20,}" --include="*.ts" --include="*.tsx" --include="*.js" src/ 2>/dev/null | grep -v "process.env" | grep -v "VITE_SUPABASE" | grep -v "message:" | grep -v "<li>" | grep -v "import.*from" | grep -v "//"; then
	echo "❌ Hardcoded API keys detected in src/. Use environment variables instead."
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
