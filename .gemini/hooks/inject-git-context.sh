#!/usr/bin/env fish
# Hook: BeforeAgent / SessionStart
# Injects real-time git context into every Gemini session
# So the AI always knows branch, status, and recent changes

set input (cat)
set git_branch (git branch --show-current 2>/dev/null)
set git_status (git status --short 2>/dev/null)
set git_log (git log --oneline -3 2>/dev/null)

# Only inject if in a git repo
if test -z "$git_branch"
    echo '{"systemMessage": "Not a git repo"}'
    exit 0
end

set context "📂 **Current Branch:** $git_branch\n\n📊 **Git Status:**\n```\n$git_status\n```\n\n📜 **Recent Commits:**\n```\n$git_log\n```"

# Output JSON to stdout (logs to stderr)
echo "Injected git context: $git_branch" >&2

printf '{"systemMessage": "Git context injected", "hookSpecificOutput": {"additionalContext": %s}}' \
    (echo "$context" | jq -Rs .)

exit 0
