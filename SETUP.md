# SETUP.md — instructions for Claude

You are setting up the `/go` workflow for this user's actual work environment. Read this file
completely, then work through the phases in order.

Your goal: every `{{PLACEHOLDER}}` and every `<!-- SETUP: ... -->` comment in `agents/` and
`commands/` replaced with the user's real values, and the result installed.

There is deliberately little to fill in. `/go` has no stack-specific rules. Conventions come from
each repo's own `AGENTS.md` / `CLAUDE.md` and the superpowers and grilling skills. What remains is a
handful of per-team values. **Discover them before you ask about them.**

Throughout: `$REPOS` means **the list of repositories the user actually works in**, established in
A1.

---

## Phase A: Discover

### A1 — Establish which repos to configure for

Ask the user which repositories this should cover: a parent directory, several, or individual
repo paths. If they're not sure, propose candidates from what they already work in:

```bash
ls ~/.claude/projects/ 2>/dev/null    # dir names are path-encoded: -Users-me-src-api → /Users/me/src/api
```

The common parent of the confirmed repos is the candidate `{{WORKSPACE_ROOT}}`. If they don't share
one, tell the user that Step 1's repo list will only show repos under the root they pick.

### A2 — Read each repo

For each repo in `$REPOS`:

```bash
cd <repo>
git log --oneline -30                                    # ticket prefix in commit messages
git branch -r --sort=-committerdate | head -20           # branch naming
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null    # default branch
gh api "repos/{owner}/{repo}/pulls/comments?per_page=100" --jq '.[].user.login' 2>/dev/null | sort | uniq -c | sort -rn | head
```

The last command lists who comments on PRs. A `[bot]` login that shows up often (e.g.
`cursor[bot]`) is the candidate `{{REVIEW_BOT_LOGIN}}`.

Also check `AGENTS.md` / `CLAUDE.md` for push-hook branch-name rules. Branches are named
`<TICKET>` or `<TICKET>-<suffix>`, so the ticket prefix must satisfy any such hook.

### A3 — Inventory the tracker

```bash
python3 -c "import json;print(list(json.load(open('$HOME/.claude.json')).get('mcpServers',{}).keys()))" 2>/dev/null
for r in <each repo>; do echo "$r:"; cat "$r/.mcp.json" 2>/dev/null; done
```

Find the tracker server (Jira, Linear, …) and the tool that fetches one ticket. Bob has no `tools:`
allowlist, so there is no tool name to keep in sync. `{{TRACKER_CONFIG}}` only needs the fetch tool
and its constants (e.g. Jira cloud ID + project key).

Present a short summary of everything found and let the user correct it before you write anything.

---

## Phase B: Ask (only what you couldn't discover)

Keep this to one round.

**B1. Tracker**: which one, the project key, and whether quick wins should get a real ticket at
all.

**B2. Ticket defaults**: board/sprint/assignee for auto-created tickets (`{{TICKET_DEFAULTS}}`,
`create-ticket.md`).

**B3. Workspace root**: confirm the A1 candidate for `{{WORKSPACE_ROOT}}`.

**B4. Review bot**: confirm the A2 candidate for `{{REVIEW_BOT_LOGIN}}`, or `none`. With `none`,
delete Step 8 and every mention of the review-bot loop from `go.md`, including the handoff-block
line.

**B5. Persona**: the crew ships themed as Minions (Bob 🥽 reads the ticket, Carl 🔍 checks the plan,
Kevin 👔 reviews, the user is "Boss Gru"). **Default to keeping it.** If they re-theme, re-theme
all three agent files *and* `go.md` together.

Don't ask about anything you can read from their repos.

---

## Phase C: Fill It In

Delete each `<!-- SETUP: ... -->` comment as you satisfy it.

| File | What to write |
|---|---|
| `commands/go.md` | Setup Values table, `{{TICKET_DEFAULTS}}`, persona |
| `commands/create-ticket.md` | Tracker steps + defaults, or delete the file (and go.md's quick-win ticket step) if they don't use one |
| `agents/ticket-planner.md` | `{{TICKET_PREFIX}}`, `{{TRACKER_CONFIG}}` |

`agents/plan-reviewer.md` and `agents/reviewer.md` have no placeholders.

---

## Phase D: Install and Verify

```bash
./install.sh
```

### D1 — Nothing left unfilled

```bash
# scoped to agents/ + commands/ — README.md and SETUP.md legitimately contain these strings
grep -rn "{{" --include="*.md" agents commands           # must be empty
grep -rn "SETUP:" --include="*.md" agents commands       # must be empty
grep -h "^name:" agents/*.md   # must be: ticket-planner, plan-reviewer, reviewer
```

### D2 — The configured values are *true*, not just present

- **Tracker**: make one real read call (fetch any existing ticket). A dead tool or a wrong ID passes
  D1 and fails mid-run otherwise.
- **Default branch**: `git -C <repo> rev-parse --verify origin/<default>` for each repo.
- **Review bot**: the login appears in the A2 comment list.
- **Plugins**: `claude plugin list` shows `superpowers` and `mattpocock-skills`.

Report which probes passed. A probe you skipped is a guess.

### D3 — Nothing shadows the global agents

A project-level agent with the same `name:` silently beats the user-level one. Worktrees carry their
own `.claude/` along and are the usual culprit:

```bash
for r in <each repo>; do find "$r" -path '*/.claude/agents/*.md' -not -path '*/plugins/*'; done
```

If duplicates of the three names turn up, tell the user and offer to remove them.

Finally, report what you configured and **explicitly list anything you guessed**.

---

## Phase E: Tell them how to iterate

> The crew's conventions come from each repo's `AGENTS.md` / `CLAUDE.md`, not from this repo. When
> Kevin or an implementer misses a rule a human catches in review, write that rule into the repo's
> `AGENTS.md`. Every minion, and every other tool you use, picks it up from there.
