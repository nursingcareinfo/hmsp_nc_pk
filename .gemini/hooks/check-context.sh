#!/usr/bin/env bash
# Hook: Check if context compaction is needed
# Triggered after agent responses

set -e

input=$(cat)

# Check for context size indicators
# This is a simple heuristic - in practice you'd check actual token usage
message_count=$(echo "$input" | jq -r '.message_count // 0' 2>/dev/null || echo "0")

if [ "$message_count" -gt 50 ] 2>/dev/null; then
  cat <<EOF
{
  "decision": "allow",
  "suggestion": "Consider using /strategic-compact to reduce context size. You've exchanged $message_count messages.",
  "systemMessage": "💡 Context is getting large ($message_count messages). Run /strategic-compact to save tokens and maintain performance."
}
EOF
else
  echo '{"decision": "allow"}'
fi

exit 0
