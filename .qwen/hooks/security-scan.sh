#!/usr/bin/env fish
# Hook: PreToolUse — Security validator for Qwen Code
# Blocks dangerous commands, secrets, destructive operations

set input (cat)
set tool_name (echo "$input" | jq -r '.tool_name // ""')
set session_id (echo "$input" | jq -r '.session_id // ""')

# Log the tool use
echo "🔍 PreToolUse: $tool_name (session: $session_id)" >&2

# ── Shell command validation ──────────────────
if test "$tool_name" = "run_shell_command"
    set cmd (echo "$input" | jq -r '.tool_input.command // ""')

    # Block destructive operations
    if echo "$cmd" | grep -qE 'rm\s+-rf\s+/'
        printf '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Destructive rm -rf / blocked"}}'
        exit 2
    end

    if echo "$cmd" | grep -qE 'dd\s+if=|mkfs|:(){:|sudo\s+rm'
        printf '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Dangerous command blocked: %s"}}' "$cmd"
        exit 2
    end
end

# ── File write validation ─────────────────────
if test "$tool_name" = "write_file" -o "$tool_name" = "edit_file"
    set file_path (echo "$input" | jq -r '.tool_input.file_path // ""')
    set content (echo "$input" | jq -r '.tool_input.content // .tool_input.new_string // ""')

    # Check for hardcoded secrets
    set secrets "sk-proj-" "AIza" "AKIA" "BEGIN.*PRIVATE KEY" "password.*=.*['\"].{8,}"
    for pattern in $secrets
        if echo "$content" | grep -qE "$pattern"
            printf '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "Hardcoded secret detected (%s). Use environment variables.", "additionalContext": "🚨 Secret pattern detected: %s"}}' "$pattern" "$pattern"
            exit 2
        end
    end
end

echo "✅ Security check passed" >&2
printf '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "allow", "permissionDecisionReason": "Security validation passed"}}'
exit 0
