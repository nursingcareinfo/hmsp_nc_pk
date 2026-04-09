#!/usr/bin/env fish
# Hook: PostToolUse — Run vite build after multiple file edits
# Catches production build errors before they reach deploy
# Only runs once per session to save time (uses marker file)
set input (cat)
set tool_name (echo "$input" | jq -r '.tool_name // ""')
set session_id (echo "$input" | jq -r '.session_id // "unknown"')

if test "$tool_name" != "write_file" -a "$tool_name" != "edit_file"
    echo '{}'
    exit 0
end

# Only check source files
set file_path (echo "$input" | jq -r '.tool_input.file_path // ""')
if not echo "$file_path" | grep -qE 'src/'
    echo '{}'
    exit 0
end

# Rate limit: only check once per session
set marker "/tmp/qwen-build-check-$session_id"
if test -f "$marker"
    echo '{}'
    exit 0
end
touch "$marker"

echo "🔨 Running vite build check..." >&2

set build_output (npm run build 2>&1)
set build_status $status

if test $build_status -ne 0
    set errors (echo "$build_output" | grep -E "error|Error|failed|Failed" | head -10)
    echo "❌ Build failed!" >&2

    printf '{"systemMessage": "Build failed", "hookSpecificOutput": {"additionalContext": "❌ **Vite Build Failed:**\n```\n%s\n```\n\nPlease fix these build errors before proceeding."}}' \
        (echo "$errors" | jq -Rs .)
else
    set size (echo "$build_output" | grep -oE '[0-9]+\s+kB' | head -1)
    echo "✅ Build passed ($size)" >&2
    printf '{"systemMessage": "✅ Build passed (%s)"}' "$size"
end

exit 0
