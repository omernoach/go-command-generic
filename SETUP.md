# SETUP.md — instructions for Claude

You are setting up the `/go` workflow for this user's actual work environment. Read this file
completely, then work through the phases in order.

Your goal: every `{{PLACEHOLDER}}` and every `<!-- SETUP: ... -->` comment in this repo replaced
with content specific to the user's repos, and the result installed. The finished setup should feel
like it was written *for* their codebase — not like a template with the blanks filled.

**The single biggest quality lever is Phase A.** Conventions you *discover* by reading their repos
beat conventions you ask about, because the user will forget half of them. Read first, ask second.

---

## Phase A: Discover

Ask the user which directory holds their repos (e.g. `~/work`) if they haven't said. Then, for each
repo you find:

```bash
ls ~/work
```

For each candidate repo, gather:

```bash
cd <repo>
ls nx.json *.sln go.mod Cargo.toml pyproject.toml package.json turbo.json 2>/dev/null   # stack
ls pnpm-lock.yaml yarn.lock package-lock.json uv.lock poetry.lock 2>/dev/null            # package manager
ls AGENTS.md CLAUDE.md CONTRIBUTING.md 2>/dev/null                                       # conventions
git log --oneline -30                                                                    # commit + ticket format
git branch -r --sort=-committerdate | head -20                                           # branch naming
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null                                    # default branch
ls .claude/agents .claude/commands .claude/skills 2>/dev/null                            # existing setup
```

Read every `AGENTS.md` / `CLAUDE.md` you find, **including nested ones** — those hold the rules
worth putting in the Reviewer, and they are usually the highest-signal documents in the repo.

Extract, per repo:

| What | Where to find it |
|---|---|
| Stack + a detection check that's unique to it | the files listed above |
| Package manager | the lockfile, never the docs |
| Test command (+ required env vars) | `AGENTS.md`, CI workflow files, `package.json` scripts |
| Affected-project detection | Nx/Turbo/Bazel config, or path→test-project convention |
| Ticket prefix + branch format | `git log`, branch names, any push-hook rules in `AGENTS.md` |
| Enforced rules (analyzers, linters, CI gates) | `AGENTS.md`, analyzer configs, lint configs |
| Domain/path map | top-level directory layout |
| Cross-repo dependencies | `AGENTS.md` mentions of companion PRs, infra repos, generated clients |

Also check what tracker MCP is actually connected — the tracker tool names must be **verified**, not
assumed:

```bash
cat ~/.claude.json 2>/dev/null | python3 -c "import json,sys;print(list(json.load(sys.stdin).get('mcpServers',{}).keys()))" 2>/dev/null
ls ~/work/*/.mcp.json 2>/dev/null
```

A tool name that doesn't resolve produces **no error** — just a silent fallback to asking the user
to paste the ticket, forever. Confirm the name exists before writing it into `ticket-planner.md`.

Present a short summary of what you found and let the user correct it before you write anything.

---

## Phase B: Ask (only what you couldn't discover)

Keep this to one round. Good questions:

1. **Tracker** — which one, project key, and whether quick wins should get a real ticket at all.
2. **Default board/sprint and assignee** for auto-created tickets.
3. **PR policy** — draft by default? A template? Companion PRs in another repo?
4. **Post-ship artifact** — is there a build the user runs to test locally (an extension bundle, a
   container image, a CLI binary)? Which changes justify it?
5. **Persona** — should the agents have a theme and a name for the user, or stay neutral? This
   sounds cosmetic; it isn't. A consistent voice makes a long autonomous run far easier to skim,
   and it makes phase boundaries obvious at a glance.

Don't ask about anything you can read from their repos.

---

## Phase C: Fill It In

Work file by file. Delete each `<!-- SETUP: ... -->` comment as you satisfy it, and delete every
example block once replaced — a leftover example is worse than nothing, because the agent will
follow it.

| File | What to write |
|---|---|
| `commands/go.md` | Setup Values table, stack detection, branch-format rules, `[stack only]` implementation rules, PR policy, post-ship step, global rules |
| `commands/create-ticket.md` | Tracker steps + defaults, or delete the file if they don't use one |
| `agents/ticket-planner.md` | Tracker MCP tools in frontmatter, tracker config, domain map, cross-cutting flags |
| `agents/plan-reviewer.md` | Stack detection, stack gotchas (tooling-enforced rules) |
| `agents/reviewer.md` | Stack detection, **stack-specific conventions** — the highest-value section |
| `agents/test-runner.md` | Affected-project detection, exact test commands with env vars |

### The quality bar

Rules must be **checkable**. Compare:

- ❌ "Follow good practices in the service layer"
- ✅ "Handlers must go through the base class's `Execute()` wrapper; one without a registered
     request validator fails the build — see the analyzer rule in `<config file>`"

- ❌ "Be careful with shared code"
- ✅ "Anything added to the shared contracts package version-bumps every consumer — check that a
     different service actually needs it before putting it there"

The second kind comes from reading their `AGENTS.md`. If a rule you're about to write couldn't be
disputed with a `file:line`, it isn't worth including.

### Rules of thumb

- **Prefix stack-specific rules** with the stack (`**[BACKEND only]**`) so other repos skip them
  cleanly. A frontend checklist applied to a Go service produces noise, and noisy reviews get ignored.
- **Keep the three stack-detection blocks identical** across `go.md`, `plan-reviewer.md`,
  `reviewer.md`, and `test-runner.md`. Divergence here causes agents to disagree about what repo
  they're in.
- **Default to the repo's own docs.** For any stack you don't have detail on, "read the nearest
  `AGENTS.md`/`CLAUDE.md` and follow it" is a better instruction than invented rules.
- **6-10 checkboxes per stack** in the Reviewer. Fewer misses things; more gets skimmed.

---

## Phase D: Install and Verify

```bash
./install.sh
```

Then verify:

```bash
# scoped to agents/ + commands/ — README.md and SETUP.md legitimately contain these strings
grep -rn "{{" --include="*.md" agents commands              # must be empty
grep -rn "SETUP:" --include="*.md" agents commands          # must be empty
grep -rni "delete and replace" --include="*.md" agents      # must be empty
grep -h "^name:" agents/*.md    # must be: ticket-planner, plan-reviewer, reviewer, test-runner
```

Then check nothing shadows the global agents — a project-level agent with the same `name:` silently
wins over the user-level one:

```bash
find ~/work -path '*/.claude/agents/*.md' -not -path '*/plugins/*'
```

Stale git worktrees are the usual culprit; they carry their own `.claude/` along. If you find
duplicates of these four names, tell the user and offer to remove them.

Finally, report what you configured: the stacks, the test commands, the tracker, and — explicitly —
anything you had to guess, so the user knows which parts to sanity-check on the first real run.

---

## Phase E: Tell them how to iterate

The first run will expose rules nobody remembered. Tell the user:

> When the Reviewer flags something you disagree with, or misses something a human caught in review,
> edit `agents/reviewer.md` and commit. That file is the one that compounds — it's the difference
> between a generic reviewer and one that knows your codebase.
