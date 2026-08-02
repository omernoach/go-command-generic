# SETUP.md — instructions for Claude

You are setting up the `/go` workflow for this user's actual work environment. Read this file
completely, then work through the phases in order.

Your goal: every `{{PLACEHOLDER}}` and every `<!-- SETUP: ... -->` comment in this repo replaced
with content specific to the user's repos, and the result installed. The finished setup should feel
like it was written *for* their codebase — not like a template with the blanks filled.

**The biggest quality lever is Phase A.** Conventions you *discover* by reading their repos beat
conventions you ask about, because the user will forget half of them. Read first, ask second.

Throughout: `$REPOS` means **the list of repositories the user actually works in**, established in
A1. It is a list, not a directory — never assume their repos share a parent folder.

---

## Phase A: Discover

### A1 — Establish which repos to configure for

Ask the user which repositories this should cover. Accept any of: a parent directory, several
parent directories, individual repo paths, or a single repo. Do not assume a layout.

If they're not sure, propose candidates from what they already work in — this reveals scattered
repos that no directory listing would find:

```bash
ls ~/.claude/projects/ 2>/dev/null    # dir names are path-encoded: -Users-me-src-api → /Users/me/src/api
```

Confirm the shortlist before continuing. A user with 20 repos usually wants 2 or 3 configured;
setting up for all of them produces mush. Everything below loops over the confirmed list.

### A2 — Read each repo

For each repo in `$REPOS`:

```bash
cd <repo>
ls package.json pyproject.toml go.mod Cargo.toml pom.xml build.gradle 2>/dev/null   # language
ls nx.json turbo.json lerna.json pnpm-workspace.yaml 2>/dev/null                    # monorepo tooling
ls *.sln *.slnf global.json Directory.Build.props 2>/dev/null                       # .NET variants
ls pnpm-lock.yaml yarn.lock package-lock.json uv.lock poetry.lock 2>/dev/null       # package manager
ls AGENTS.md CLAUDE.md CONTRIBUTING.md 2>/dev/null                                  # conventions
git log --oneline -30                                    # commit + ticket format
git branch -r --sort=-committerdate | head -20           # branch naming
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null    # default branch
```

**Probe for the marker that's actually there — never assume the canonical one exists.** A .NET
monorepo may have only `.slnf` solution filters and no `.sln`; a Python repo may have `setup.py`
and no `pyproject.toml`; a JS monorepo may declare workspaces inside `package.json` with no
workspace file at all. A detection rule built on a file that isn't present silently matches nothing
and every stack-specific rule you write goes dead.

**Read the convention documents, including nested ones** — `AGENTS.md` and `CLAUDE.md` at the root
*and* in subdirectories. These are the highest-signal documents in the repo and the main source for
the Reviewer's checklist.

**Also mine the user's existing Claude Code setup** — conventions frequently live here and nowhere
else:

```bash
ls .claude/skills/*/SKILL.md .claude/agents/*.md .claude/commands/*.md 2>/dev/null
ls ~/.claude/skills/*/SKILL.md ~/.claude/agents/*.md 2>/dev/null
```

A skill written for one workflow often states a convention that appears in no `AGENTS.md`
("routing goes through the router helper", "API access uses the client factory"). Grep them for
recurring API names, helper functions, and "always/never" phrasing.

Extract, per repo:

| What | Where to find it |
|---|---|
| Stack + a detection check unique to it | the marker files above — the ones that exist |
| Package manager | the lockfile, never the docs |
| Test command (+ required env vars) | `AGENTS.md`, CI workflow files, package scripts, Makefile |
| Affected-project detection | monorepo tool config, or a path→test-project convention |
| Ticket prefix + branch format | `git log`, branch names, push-hook rules in `AGENTS.md` |
| Enforced rules (analyzers, linters, CI gates) | `AGENTS.md`, analyzer/lint configs, CI files |
| Domain/path map | directory layout — but see B1, it is rarely complete |
| Cross-repo dependencies | mentions of companion PRs, infra repos, generated clients |

### A3 — Prove the detection actually discriminates

Write the candidate detection check, then **run it against every repo in `$REPOS`** and confirm
each lands on exactly one stack — and, just as important, that repos it should *not* match don't.

```bash
for r in <each repo>; do echo "$r → $(<your detection check>)"; done
```

A marker you assumed was distinctive is often not: a monorepo tool config can appear in four
unrelated repos, including ones from a different ecosystem entirely. If a check matches more than
one stack, add a second condition until it discriminates. Skipping this step is how a frontend
checklist ends up firing inside a backend repo.

### A4 — Inventory the MCP servers that actually exist

```bash
python3 -c "import json;print(list(json.load(open('$HOME/.claude.json')).get('mcpServers',{}).keys()))" 2>/dev/null
# plus per-repo servers:
for r in <each repo>; do echo "$r:"; cat "$r/.mcp.json" 2>/dev/null; done
```

Two kinds matter, and both belong in `ticket-planner.md`'s `tools:` list:

- **Tracker** servers (Jira, Linear, …) — for fetching tickets
- **Codebase-reading** servers (monorepo graph tools, docs search, database introspection) — these
  make the Planner materially better and are the ones most often forgotten

**Verify every tool name before writing it in.** A name that resolves to nothing produces *no
error* — just a silent fallback, on every run, forever. Confirm the server is connected and the
tool exists.

Present a short summary of everything found and let the user correct it before you write anything.

---

## Phase B: Ask (only what you couldn't discover)

Keep this to one round.

**B1. The domain map — ask this one always.** Directory layout gives you the top-level split; it
never gives you that a product area spans three unrelated paths, or that two sibling folders are
really one domain. Ask: *"which areas of these repos do you actually work in, and which paths does
each cover?"* This is org knowledge, and it is the single most valuable answer in this phase.

**B2. Tracker** — which one, project key, and whether quick wins should get a real ticket at all.

**B3. Ticket defaults** — board/sprint/assignee for auto-created tickets.

**B4. PR policy** — draft by default? A template? Companion PRs in another repo?

**B5. Post-ship artifact** — is there a build they run to test locally (a bundle, an image, a
binary)? Which changes justify it?

**B6. Persona** — the crew ships themed as Minions (Bob 🥽 plans, Carl 🔍 validates, Kevin 👔
reviews, Stuart 👁️ tests, user is "Boss Gru"). Keep it, or re-theme? This sounds cosmetic; it
isn't — a consistent voice makes a long autonomous run far easier to skim, and named characters
make phase boundaries obvious at a glance. **Default to keeping it.** If they do re-theme, re-theme
all four agent files *and* `go.md` together so the voice survives handoffs.

Don't ask about anything you can read from their repos.

---

## Phase C: Fill It In

Work file by file. Delete each `<!-- SETUP: ... -->` comment as you satisfy it, and delete every
example block once replaced — a leftover example is worse than nothing, because the agent follows it.

| File | What to write |
|---|---|
| `commands/go.md` | Setup Values, stack detection, branch-format rules, `[stack only]` implementation rules, PR policy, post-ship step, global rules |
| `commands/create-ticket.md` | Tracker steps + defaults, or delete the file if they don't use one |
| `agents/ticket-planner.md` | Tracker **and codebase-reading** MCP tools in frontmatter, tracker config, domain map, cross-cutting flags |
| `agents/plan-reviewer.md` | Stack detection, stack gotchas (tooling-enforced rules) |
| `agents/reviewer.md` | Stack detection, **stack-specific conventions** — the highest-value section |
| `agents/test-runner.md` | Affected-project detection, exact test commands with env vars |

### The quality bar

Rules must be **checkable**:

- ❌ "Follow good practices in the service layer"
- ✅ "Handlers must go through the base class's `Execute()` wrapper; one without a registered
     request validator fails the build — the analyzer catches it"

- ❌ "Be careful with shared code"
- ✅ "Anything added to the shared contracts package version-bumps every consumer — check that
     another service actually needs it first"

If a rule couldn't be disputed with a `file:line`, it isn't worth including.

### Rules of thumb

- **Prefix stack-specific rules** with the stack (`**[BACKEND only]**`) so other repos skip them.
  A frontend checklist applied to a backend service produces noise, and noisy reviews get ignored.
- **Paste the stack-detection block identically** into `go.md`, `plan-reviewer.md`, `reviewer.md`,
  and `test-runner.md`. Divergence makes the agents disagree about which repo they're in.
- **Default to the repo's own docs.** For any stack you lack detail on, "read the nearest
  `AGENTS.md`/`CLAUDE.md` and follow it" beats invented rules.
- **6-10 checkboxes per stack** in the Reviewer. Fewer misses things; more gets skimmed.

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
grep -rni "delete and replace" --include="*.md" agents   # must be empty
grep -h "^name:" agents/*.md   # must be: ticket-planner, plan-reviewer, reviewer, test-runner
```

### D2 — The detection blocks are identical

Print the detection command from each file and confirm they read the same:

```bash
for f in commands/go.md agents/*.md; do
  printf "%-26s %s\n" "$(basename "$f")" "$(grep -m1 -oE '^ *ls [-a-z]*\.?[a-z]*.*' "$f")"
done
```

All five must print the same command. (Anchor the pattern to a line starting with `ls` — an
unanchored `ls .*` matches prose like "fai**ls at** push time".)

Divergence here is silent, so check it rather than trusting the paste.

### D3 — The configured values are *true*, not just present

D1 proves no placeholder survived. It proves nothing about whether the values work. A wrong test
command, a tracker ID that 404s, an MCP tool name that resolves to nothing — all pass D1 and then
fail on the first real `/go`, mid-run, after the work is done.

Probe each cheaply. **Don't run a full test suite** — setup should not hang for minutes:

- **Test command**: run its list/dry-run form to prove the command, the project path, and any
  required env vars resolve. Most runners have one — a `--list`/`--collect-only`/`--dry-run` flag,
  or the monorepo tool's project-listing command.
- **Affected detection**: run it once and confirm it returns a plausible project list.
- **Tracker**: make one real read call (fetch any existing ticket). This catches the dead-tool-name
  failure, which is otherwise invisible.
- **Stack detection**: re-run the A3 loop against `$REPOS`.

Report which probes passed. A probe you skipped is a guess.

### D4 — Nothing shadows the global agents

A project-level agent with the same `name:` silently beats the user-level one. Check each repo in
`$REPOS`, including any git worktrees under it — worktrees carry their own `.claude/` along and are
the usual culprit:

```bash
for r in <each repo>; do find "$r" -path '*/.claude/agents/*.md' -not -path '*/plugins/*'; done
```

If duplicates of the four names turn up, tell the user and offer to remove them.

Finally, report what you configured — the repos, stacks, test commands, tracker — and **explicitly
list anything you guessed**, so the user knows what to watch on the first real run.

---

## Phase E: Tell them how to iterate

The first run exposes rules nobody remembered. Tell the user:

> When the Reviewer flags something you disagree with, or misses something a human caught in review,
> edit `agents/reviewer.md` and commit. That file is the one that compounds — it's the difference
> between a generic reviewer and one that knows your codebase.

If a repo has no written conventions at all, say so plainly: the Reviewer starts generic there and
gets sharper as they add rules. That's the honest outcome, not a setup failure.
