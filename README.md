# go-command

A `/go` workflow for Claude Code: one command that takes a ticket from plan to pull request, with
four specialist agents doing the parts they're each good at.

```
/go PROJ-1234              # plan → validate plan → implement → review → test → PR
/go Fix the login crash    # no ticket? one gets created first
/go PROJ-1234 autopilot    # same, fully autonomous — no questions asked
```

Every run happens in its own git worktree, so an autonomous run never touches your working copy.

| | Agent | Does |
|---|---|---|
| **Planner** | `ticket-planner` | Reads the ticket, explores the code, proposes 2–3 approaches |
| **Validator** | `plan-reviewer` | Checks the chosen approach *before* code is written — verifies every assumed hook point actually exists, traces callers for side effects, looks for a simpler path |
| **Reviewer** | `reviewer` | Reviews the diff against your codebase's real conventions |
| **Tester** | `test-runner` | Runs the affected tests, reports only what broke |

The Validator is the one that earns its keep. Most wasted implementations come from a plan that
read well and rested on an assumption nobody opened a file to check.

---

## Setup

**This repo ships with placeholders on purpose.** A generic reviewer that says "follow good
practices" is worth nothing; one that knows your module boundaries and your analyzer rules catches
real bugs. The setup step is where that difference gets filled in — and Claude can do it for you by
reading your repos.

```bash
git clone git@github.com:omernoach/go-command-generic.git go-command
cd go-command
```

Then open Claude Code in that directory and say:

> **read SETUP.md and set this up for my repos in ~/work**

Claude will scan your repos, read their `AGENTS.md`/`CLAUDE.md` files, infer your stacks, package
managers, test commands, ticket prefix and branch conventions, ask about the handful of things it
can't detect, fill in every placeholder, and run `./install.sh`. Expect one round of questions and
a summary of anything it had to guess.

Prefer to do it by hand? Everything is plain markdown — `grep -rn "{{" .` lists every decision, and
each one sits next to a `<!-- SETUP: -->` comment explaining what good looks like. Then run
`./install.sh`.

Either way, `install.sh` symlinks the commands and agents into `~/.claude/`, which Claude Code
loads in **every** repo. Clone it anywhere — the script resolves its own location. Nothing is
copied, so `git pull` updates your setup with no reinstall.

---

## What you're filling in

| Placeholder | Lives in | Why it matters |
|---|---|---|
| `{{TICKET_PREFIX}}`, `{{DEFAULT_BRANCH}}`, `{{BRANCH_FORMAT}}` | `go.md` | Branch naming that a push hook won't reject after the work is done |
| `{{STACK_DETECTION}}` | `go.md` + all agents | One check that tells the crew which repo they're in — keep all copies identical |
| `{{STACK_CONVENTIONS}}` | `reviewer.md` | **The highest-value section in the repo.** See below. |
| `{{STACK_GOTCHAS}}` | `plan-reviewer.md` | The tooling-enforced rules that fail late and loudly |
| `{{TEST_COMMANDS}}`, `{{AFFECTED_DETECTION}}` | `test-runner.md` | Exact commands and env vars — a missing env var looks just like a real failure |
| `{{TRACKER_TOOLS}}`, `{{TRACKER_CONFIG}}` | `ticket-planner.md`, `create-ticket.md` | Which tracker, and the MCP tool names that actually resolve |
| `{{IMPLEMENT_RULES}}`, `{{PR_POLICY}}`, `{{POST_SHIP_STEP}}` | `go.md` | Your team's conventions for writing and shipping the change |
| `{{PERSONA}}` | all | Optional theme. Sounds cosmetic; makes long autonomous runs much easier to skim |

### The one section worth real effort

`agents/reviewer.md` → **Step 3: Stack-Specific Conventions**. Write the rules your team actually
comments on in review — the ones a new hire gets wrong — not generic clean-code advice. Aim for
6–10 checkboxes per stack, and prefer rules that something enforces:

- ❌ "Follow good practices in the service layer"
- ✅ "Handlers must go through the base class's `Execute()` wrapper; one without a registered
     request validator fails the build — the analyzer catches it"

The second kind is objectively checkable, so the Reviewer can't hedge — and it usually already
exists, written down in your `AGENTS.md`. Setup pulls from there first.

---

## Works in any repo

`/go` and all four agents detect the stack once and adapt. Anything unrecognised falls back to the
repo's own `AGENTS.md` / `CLAUDE.md`, so pointing this at a new repo needs no changes here — it
just gets sharper once you add that stack to the conventions blocks.

## Recommended additions

Worth adding once the basics work:

- **An `AGENTS.md` in each repo**, if you don't have one. Every agent here reads it, so it's the
  cheapest way to improve all four at once — and it helps every other tool you use too.
- **A post-ship artifact step** (`{{POST_SHIP_STEP}}`) if you have something to build for local
  testing. Gate it on the diff actually touching that code, or you'll pay for it on every PR.
- **Companion-PR rules**, if a change here ever requires a change in an infra or config repo.
  That's the classic thing discovered after merge.
- **Skills** for repetitive multi-step tasks in your domain. Phase 1.75 loads them automatically.
- **Feed review misses back in.** When a human catches something the Reviewer missed, add it to
  `reviewer.md` and commit. That file is what compounds.

## Requirements

Claude Code, `git`, and `gh` for PR creation. A tracker MCP (Jira, Linear, …) is only needed for
the ticket steps; everything else works without one.
