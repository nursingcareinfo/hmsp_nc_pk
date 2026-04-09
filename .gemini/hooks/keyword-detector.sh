#!/usr/bin/env fish
# Hook: BeforeAgent
# Detects keywords in user prompt to auto-suggest the right tool/agent
# Helps route tasks intelligently

set input (cat)
set prompt (echo "$input" | jq -r '.prompt // ""')
set prompt_lower (echo "$prompt" | tr 'A-Z' 'a-z')

set suggestions ""

# Database queries
if echo "$prompt_lower" | grep -qE 'database|query|sql|psql|supabase|table'
    set suggestions "$suggestions\n💡 **Database task** — Consider using the database window (Alt+Space 5) for psql queries."
end

# Type checking
if echo "$prompt_lower" | grep -qE 'typescript|type error|interface|type check'
    set suggestions "$suggestions\n💡 **TypeScript task** — Run `npm run typecheck` to verify. Auto-typecheck hook is active."
end

# Staff matching
if echo "$prompt_lower" | grep -qE 'staff|nurse|patient|assign|match'
    set suggestions "$suggestions\n💡 **HMSP Core** — This touches PatientModule or StaffMatchingModal. Check src/types/index.ts for types."
end

# Debug/bug
if echo "$prompt_lower" | grep -qE 'bug|error|fix|broken|not working'
    set suggestions "$suggestions\n💡 **Debugging** — Check browser console (F12), network tab, and Supabase logs."
end

# Multi-agent
if echo "$prompt_lower" | grep -qE 'compare|which.*better|opinion|debate'
    set suggestions "$suggestions\n💡 **Debate** — Use `agentpipe run -a qwen -a gemini -a opencode -t` for multi-agent discussion."
end

if test -n "$suggestions"
    printf '{"systemMessage": "Keyword suggestions", "hookSpecificOutput": {"additionalContext": "## Auto-Suggestions%s\n"}}' "$suggestions"
else
    echo '{}'
end

exit 0
