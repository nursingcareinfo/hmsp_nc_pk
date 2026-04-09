#!/usr/bin/env fish
# Hook: SessionEnd
# Saves session summary when Gemini exits
# Appends to .gemini/sessions.log for later review

set input (cat)
set timestamp (date '+%Y-%m-%d %H:%M:%S')
set log_file ".gemini/sessions.log"

# Create log file if needed
if not test -f "$log_file"
    mkdir -p .gemini
    touch "$log_file"
end

echo "[$timestamp] Session ended" >> "$log_file"
echo "[$timestamp] 💾 Session logged" >&2

echo '{"systemMessage": "Session summary saved to .gemini/sessions.log"}'
exit 0
