#!/usr/bin/env bash
# Install the /go workflow into Claude Code and/or Cursor.
#
#   ./install.sh                        interactive wizard
#   ./install.sh --claude               Claude Code only (global, every repo)
#   ./install.sh --cursor <repo>...     Cursor only, into each repo's .cursor/commands
#   ./install.sh --both <repo>...       both
set -euo pipefail
shopt -s nullglob   # an unmatched glob must expand to nothing, not to a literal "*.md"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$REPO/agents" ] || [ ! -d "$REPO/commands" ]; then
  echo "Run this from inside the go-command repo — no agents/ and commands/ next to $0" >&2
  exit 1
fi
TARGET=""
CURSOR_REPOS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --claude) TARGET="claude" ;;
    --cursor) TARGET="cursor" ;;
    --both)   TARGET="both" ;;
    -h|--help) sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "unknown option: $1" >&2; exit 1 ;;
    *)  CURSOR_REPOS+=("$1") ;;
  esac
  shift
done

# ---- wizard -----------------------------------------------------------------
if [ -z "$TARGET" ]; then
  if [ ! -t 0 ]; then
    echo "Non-interactive shell. Pass --claude, --cursor <repo>... or --both <repo>..." >&2
    exit 1
  fi
  echo
  echo "  Where should the minions live?"
  echo
  echo "    1) Claude Code   ~/.claude — one install, works in every repo, full crew"
  echo "    2) Cursor        .cursor/commands in the repos you name — no subagents (see below)"
  echo "    3) Both"
  echo
  printf "  > "
  read -r choice
  case "$choice" in
    1) TARGET="claude" ;;
    2) TARGET="cursor" ;;
    3) TARGET="both" ;;
    *) echo "  Nothing selected. Poopaye."; exit 1 ;;
  esac
fi

if { [ "$TARGET" = "cursor" ] || [ "$TARGET" = "both" ]; } && [ ${#CURSOR_REPOS[@]} -eq 0 ]; then
  if [ ! -t 0 ]; then
    echo "Cursor install needs repo paths: ./install.sh --cursor <repo>..." >&2
    exit 1
  fi
  echo
  echo "  Cursor has no global command directory, so this installs per repo."
  printf "  Repo paths (space separated): "
  read -r -a CURSOR_REPOS
fi

# ---- helpers ----------------------------------------------------------------
link() {  # link <source> <dest>
  if [ -e "$2" ] && [ ! -L "$2" ]; then
    echo "  skip  $2 (real file in the way — move it yourself)"
    return
  fi
  ln -sfn "$1" "$2"
  echo "  link  $2"
}

install_claude() {
  mkdir -p ~/.claude/agents ~/.claude/commands
  echo
  echo "  Claude Code:"
  for f in "$REPO"/agents/*.md;   do link "$f" ~/.claude/agents/"$(basename "$f")"; done
  for f in "$REPO"/commands/*.md; do link "$f" ~/.claude/commands/"$(basename "$f")"; done
}

install_cursor() {
  echo
  echo "  Cursor:"
  for r in "${CURSOR_REPOS[@]}"; do
    r="${r/#\~/$HOME}"
    if [ ! -d "$r" ]; then echo "  skip  $r (not a directory)"; continue; fi
    mkdir -p "$r/.cursor/commands"
    # Cursor has no subagent primitive, so the four minions install as commands too:
    # /go can't delegate to them, but you can invoke each one by hand.
    for f in "$REPO"/commands/*.md "$REPO"/agents/*.md; do
      link "$f" "$r/.cursor/commands/$(basename "$f")"
    done
  done
}

case "$TARGET" in
  claude) install_claude ;;
  cursor) install_cursor ;;
  both)   install_claude; install_cursor ;;
esac

# ---- after ------------------------------------------------------------------
echo
if grep -rq "{{" --include="*.md" "$REPO/agents" "$REPO/commands"; then
  echo "  Linked — but the placeholders are still unfilled, so /go stays generic."
  echo "  Open Claude Code in this repo and say:"
  echo "      read SETUP.md and set this up for my repos"
else
  echo "  Done. If an agent ever behaves like an older version, look for a project-level"
  echo "  copy shadowing it:  find <your repos> -path '*/.claude/agents/*.md'"
fi

if [ "$TARGET" = "cursor" ] || [ "$TARGET" = "both" ]; then
  echo
  echo "  Note on Cursor: it has no subagent primitive, so /go runs all four minions"
  echo "  inline in one context instead of delegating. You lose context isolation,"
  echo "  per-agent models, and read-only enforcement on the reviewer. It works —"
  echo "  it's just not the full crew. Claude Code is where they run properly."
fi
echo
