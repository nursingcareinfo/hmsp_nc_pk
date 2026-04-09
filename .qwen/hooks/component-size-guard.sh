#!/usr/bin/env fish
# Hook: PostToolUse — Enforce component size limits (AGENTS.md: max 800 lines)
# Alerts when files exceed thresholds
set input (cat)
set tool_name (echo "$input" | jq -r '.tool_name // ""')

if test "$tool_name" != "write_file" -a "$tool_name" != "edit_file"
    echo '{}'
    exit 0
end

set file_path (echo "$input" | jq -r '.tool_input.file_path // ""')

# Only check source files
if not echo "$file_path" | grep -qE 'src/.*\.(ts|tsx|js|jsx)$'
    echo '{}'
    exit 0
end

# Check file exists and get line count
if test -f "$file_path"
    set lines (wc -l < "$file_path")
    
    # Component files: 500 warning, 800 hard limit
    if test "$lines" -gt 800
        echo "🔴 CRITICAL: $file_path has $lines lines (max: 800)" >&2
        printf '{"systemMessage": "Component too large", "hookSpecificOutput": {"additionalContext": "🔴 **AGENTS.md Violation:** `%s` has **%d lines** (max 800).\n\n**Please split this file:**\n- Extract sub-components into separate files\n- Move utilities to `src/utils/`\n- Move types to `src/types/`\n- Move hooks to `src/hooks/`"}}' "$file_path" "$lines"
    else if test "$lines" -gt 500
        echo "🟡 WARNING: $file_path has $lines lines (soft limit: 500)" >&2
        printf '{"systemMessage": "Component growing large", "hookSpecificOutput": {"additionalContext": "🟡 **Consider Splitting:** `%s` has **%d lines** (recommended max: 500).\n\nNot yet blocking, but consider extracting sub-components soon."}}' "$file_path" "$lines"
    else
        echo '{}'
    end
else
    echo '{}'
end

exit 0
