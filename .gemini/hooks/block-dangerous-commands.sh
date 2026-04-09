#!/usr/bin/env bash
# Hook: Block dangerous shell commands
# Triggered before run_shell_command operations

set -e

input=$(cat)

# Extract command from tool input
command=$(echo "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# Skip if no command
if [ -z "$command" ]; then
  echo '{"decision": "allow"}'
  exit 0
fi

# List of dangerous patterns
DANGEROUS_PATTERNS=(
  'rm\s+-rf\s+/'
  'dd\s+if='
  ':(){\s*:\|:&'  # Fork bomb
  'mkfs\.'
  'chmod\s+-R\s+777'
  'sudo\s+rm\s+-rf'
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$command" | grep -qE "$pattern"; then
    cat <<EOF
{
  "decision": "deny",
  "reason": "Safety Policy: Dangerous command detected ($command). This could damage your system.",
  "systemMessage": "⛔ Dangerous command blocked: '$command' could harm your system. Use with caution or avoid."
}
EOF
    exit 0
  fi
done

# Allow the command
echo '{"decision": "allow"}'
exit 0
