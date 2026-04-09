#!/usr/bin/env fish
# Hook: BeforeTool (run_shell_command)
# Validates commit messages follow Conventional Commits format
# Format: type: description  OR  type(scope): description
# Types: feat, fix, docs, refactor, test, chore, perf, ci

set input (cat)
set cmd (echo "$input" | jq -r '.tool_input.command // ""')

# Only check git commit commands
if not echo "$cmd" | grep -q 'git commit'
    echo '{"decision": "allow"}'
    exit 0
end

# Extract commit message
set msg (echo "$cmd" | sed -n "s/.*git commit -m ['\"]\\(.*\\)['\"].*/\\1/p")

if test -z "$msg"
    echo "⚠️  Could not parse commit message, allowing" >&2
    echo '{"decision": "allow"}'
    exit 0
end

# Validate Conventional Commits
set pattern '^(feat|fix|docs|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+'

if not echo "$msg" | grep -Eq "$pattern"
    echo "❌ Invalid commit message: $msg" >&2
    echo "Expected: type: description  (e.g., feat: add user login)" >&2
    printf '{"decision": "deny", "reason": "Commit message must follow Conventional Commits: type: description. Valid types: feat, fix, docs, refactor, test, chore, perf, ci. Got: %s", "systemMessage": "❌ Invalid commit message format. Use: type: description (e.g., feat: add login)"}' "$msg"
    exit 0
end

echo "✅ Valid commit message: $msg" >&2
echo '{"decision": "allow"}'
exit 0
