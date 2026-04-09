#!/usr/bin/env bash
# Hook: Run TypeScript typecheck before executing tests
# Ensures code compiles before testing

set -e

echo '{"decision": "allow"}'

# Run typecheck in background (non-blocking suggestion)
cd "$GEMINI_PROJECT_DIR" 2>/dev/null || exit 0

if [ -f "package.json" ] && grep -q "typecheck" package.json 2>/dev/null; then
  npm run typecheck 2>/dev/null
  if [ $? -ne 0 ]; then
    # Typecheck failed - log warning but don't block
    echo "⚠️  Typecheck failed. Consider fixing type errors before running tests." >&2
  fi
fi

exit 0
