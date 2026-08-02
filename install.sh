#!/usr/bin/env bash
# Symlink this repo's commands and agents into ~/.claude so they load in every repo.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p ~/.claude/agents ~/.claude/commands

for f in "$REPO"/agents/*.md "$REPO"/commands/*.md; do
  case "$f" in
    */agents/*) dest=~/.claude/agents/$(basename "$f") ;;
    */commands/*) dest=~/.claude/commands/$(basename "$f") ;;
  esac
  if [ -e "$dest" ] && [ ! -L "$dest" ]; then
    echo "skip (real file in the way, move it yourself): $dest"
    continue
  fi
  ln -sfn "$f" "$dest"
  echo "linked $dest"
done

echo
if grep -rq "{{" --include="*.md" "$REPO/agents" "$REPO/commands"; then
  echo "Linked, but the placeholders are still unfilled — /go will be generic until you do."
  echo "Open Claude Code in this repo and say:"
  echo "    read SETUP.md and set this up for my repos in ~/work"
else
  echo "Done. If an agent ever behaves like an older version, check for a project-level copy"
  echo "shadowing it:  find ~ -path '*/.claude/agents/*.md' -not -path '*/plugins/*'"
fi
