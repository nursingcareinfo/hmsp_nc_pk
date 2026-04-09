#!/usr/bin/env fish
# Hook: PostToolUse — Auto typecheck after file edits
# If TypeScript errors found, inject them as additional context so Qwen auto-fixes

set input (cat)
set tool_name (echo "$input" | jq -r '.tool_name // ""')

if test "$tool_name" != "write_file" -a "$tool_name" != "edit_file"
    echo '{}'
    exit 0
end

echo "🔍 Running typecheck after $tool_name..." >&2

set ts_output (npx tsc --noEmit 2>&1)
set ts_status $status

if test $ts_status -ne 0
    set errors (echo "$ts_output" | grep "error TS" | head -5)
    set error_count (echo "$ts_output" | grep "error TS" | wc -l)

    echo "❌ $error_count type errors found" >&2

    printf '{"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "❌ **TypeScript Errors (%d found):**\n```\n%s\n```\n\nPlease fix these in your next response."}}' \
        "$error_count" (echo "$errors" | jq -Rs .)
else
    echo "✅ TypeScript clean" >&2
    printf '{"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "✅ TypeScript check passed"}}'
end

exit 0
