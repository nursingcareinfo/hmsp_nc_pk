#!/usr/bin/env fish
# Hook: SessionStart — Inject git context into every Qwen session
set input (cat)
set git_branch (git branch --show-current 2>/dev/null)
set git_status (git status --short 2>/dev/null)
set git_log (git log --oneline -3 2>/dev/null)

if test -z "$git_branch"
    echo '{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "Not a git repo"}}'
    exit 0
end

set context "📂 **Branch:** $git_branch\n\n📊 **Status:**\n```\n$git_status\n```\n\n📜 **Recent:**\n```\n$git_log\n```"

printf '{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": %s}}' \
    (echo "$context" | jq -Rs .)

exit 0
