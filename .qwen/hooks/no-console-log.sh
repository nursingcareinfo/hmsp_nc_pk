#!/usr/bin/env fish
# Hook: PostToolUse — Detect console.log in production code
# AGENTS.md anti-pattern: "❌ Console.log in production code — use Sonner toasts"
set input (cat)
set tool_name (echo "$input" | jq -r '.tool_name // ""')

if test "$tool_name" != "write_file" -a "$tool_name" != "edit_file"
    echo '{}'
    exit 0
end

set file_path (echo "$input" | jq -r '.tool_input.file_path // ""')
set content (echo "$input" | jq -r '.tool_input.content // .tool_input.new_string // ""')

# Only check source files
if not echo "$file_path" | grep -qE 'src/.*\.(ts|tsx|js|jsx)$'
    echo '{}'
    exit 0
end

# Check for console.log/console.warn/console.error
set console_calls (echo "$content" | grep -nE 'console\.(log|warn|error|debug|info)' | head -5)
if test -n "$console_calls"
    set count (echo "$content" | grep -cE 'console\.(log|warn|error|debug|info)')

    echo "⚠️  Found $count console.* calls in $file_path" >&2

    printf '{"systemMessage": "console.* detected", "hookSpecificOutput": {"additionalContext": "⚠️ **AGENTS.md Violation:** Found %d `console.*` call(s) in `%s`:\n```\n%s\n```\n\nUse **Sonner toasts** instead for user-facing messages. Use proper error handling for server-side logging.\n\nIf this is intentional debugging, add a comment: `// TODO: remove console before deploy`"}}' \
        "$count" "$file_path" (echo "$console_calls" | jq -Rs .)
else
    echo '{}'
end

exit 0
