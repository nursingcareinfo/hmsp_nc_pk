#!/usr/bin/env fish
# Hook: BeforeTool (write_file, edit_file)
# BLOCKS: Dangerous commands, secrets, file writes outside src/
# Allows: Normal development within project bounds

set input (cat)
set tool_name (echo "$input" | jq -r '.tool_name // ""')
set content (echo "$input" | jq -r '.tool_input.content // .tool_input.new_string // ""')
set file_path (echo "$input" | jq -r '.tool_input.path // .tool_input.filePath // ""')

# Check for hardcoded secrets
set secret_patterns "sk-proj-" "AIza" "AKIA" "BEGIN RSA PRIVATE KEY" "password.*=.*['\"]" "api_key.*=.*['\"]"
for pattern in $secret_patterns
    if echo "$content" | grep -qi "$pattern"
        echo "🚨 BLOCKED: Potential secret detected (pattern: $pattern)" >&2
        printf '{"decision": "deny", "reason": "Hardcoded secret detected: %s. Use environment variables.", "systemMessage": "🚨 Blocked: Potential secret in code"}' "$pattern"
        exit 0
    end
end

# Check for dangerous patterns in shell commands
if test "$tool_name" = "run_shell_command"
    set cmd (echo "$input" | jq -r '.tool_input.command // ""')

    # Block destructive operations
    if echo "$cmd" | grep -qE 'rm\s+-rf\s+/'
        echo "🚨 BLOCKED: Dangerous rm -rf /" >&2
        printf '{"decision": "deny", "reason": "Destructive command blocked: rm -rf /", "systemMessage": "🚨 Blocked: Dangerous command"}'
        exit 0
    end

    if echo "$cmd" | grep -qE 'dd\s+if=|mkfs|:(){:|:>.*\.git'
        echo "🚨 BLOCKED: Dangerous command: $cmd" >&2
        printf '{"decision": "deny", "reason": "Dangerous command blocked", "systemMessage": "🚨 Blocked: Potentially destructive command"}'
        exit 0
    end
end

# Restrict file writes to project bounds
if test -n "$file_path"
    if not echo "$file_path" | grep -qE '^(src/|public/|scripts/|supabase/|\.env|\.gemini/|AGENTS\.md|package\.json|tsconfig)'
        echo "⚠️  WARNING: Write outside standard dirs: $file_path" >&2
    end
end

echo "✅ Security check passed for: $tool_name" >&2
echo '{"decision": "allow"}'
exit 0
