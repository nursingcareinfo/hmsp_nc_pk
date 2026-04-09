#!/usr/bin/env bash
# Hook: Block secrets from being written to files
# Triggered before write_file, replace, edit operations
# Input: JSON with tool_input containing content/new_string

set -e

input=$(cat)

# Extract content from tool input
content=$(echo "$input" | jq -r '.tool_input.content // .tool_input.new_string // .tool_input.old_string // ""' 2>/dev/null || echo "")

# Skip if no content
if [ -z "$content" ]; then
  echo '{"decision": "allow"}'
  exit 0
fi

# Check for common secret patterns
SECRET_PATTERNS=(
  'sk-[A-Za-z0-9_-]{10,}'  # OpenAI/Sketch API keys
  'api[_-]?key["\s:=]+\s*["\x27][A-Za-z0-9]{10,}'  # Generic API key assignment
  'eyJhbGci'  # JWT tokens (base64 encoded)
  'AKIA[0-9A-Z]{12,}'  # AWS access keys
  'ghp_[A-Za-z0-9]{20,}'  # GitHub personal access tokens
  'xox[baprs]-[0-9]{10,}'  # Slack tokens
  'BEGIN RSA PRIVATE KEY'  # RSA private keys
  'BEGIN PRIVATE KEY'  # Generic private keys
  'supabase.*eyJhbGci'  # Supabase JWT keys
  'SUPABASE_ANON.*eyJ'  # Supabase anon keys
)

for pattern in "${SECRET_PATTERNS[@]}"; do
  if echo "$content" | grep -qE "$pattern"; then
    cat <<EOF
{
  "decision": "deny",
  "reason": "Security Policy: Potential secret detected in content (pattern: $pattern). Use environment variables instead.",
  "systemMessage": " Secret scanner blocked: Potential credential detected. Remove it and use environment variables or .env files."
}
EOF
    exit 0
  fi
done

# Allow the operation
echo '{"decision": "allow"}'
exit 0
