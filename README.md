<div align="center">

<img src="https://media.tenor.com/A3lLdiPt95AAAAAM/work-minions.gif" width="320" alt="minions working">

# 🍌 go-command 🍌

### **Bello, Boss Gru!** One command. Four minions. Ticket → PR.

*They plan it, they poke holes in the plan, they build it, they review it, they test it,
they ship it. You eat da banana.* 🍌

</div>

```
/go PROJ-1234              # plan → Carl checks it → build → Kevin reviews → Stuart tests → PR
/go Fix the login crash    # no ticket? Bob makes one first
/go PROJ-1234 autopilot    # bee do bee do bee do — fully autonomous, no questions
```

Every run happens in its own git worktree, so an autonomous minion never touches your working copy.

---

## 🍌 Meet the crew

<div align="center">

| | | Minion | Agent | What they do |
|---|---|---|---|---|
| 🥽 | **Bob** | *the eager one* | `ticket-planner` | Reads the ticket, explores the code, brings back 2–3 approaches |
| 🔍 | **Carl** | *the pessimist* | `plan-reviewer` | Opens every file the plan assumes, before a line is written |
| 👔 | **Kevin** | *the tall one* | `reviewer` | Reviews the diff against your codebase's real conventions |
| 👁️ | **Stuart** | *one eye, no patience* | `test-runner` | Runs the affected tests, reports only what broke |

</div>

> **Carl is the one who earns his banana.** Most wasted implementations come from a plan that read
> beautifully and rested on an assumption nobody opened a file to check. Carl opens the file.

```
    Bob 🥽 ──► Carl 🔍 ──► 🔨 build ──► Kevin 👔 ──► Stuart 👁️ ──► 🚀 PR
    plan       "no work!"    code        "no banana"   "bee do!"
                   │                          │            │
                   └── BLOCKER? ──────────────┴────────────┘
                       back to Boss Gru        max 2 cycles each
```

---

## 🍌 Setup

**This repo ships with placeholders on purpose.** A minion who says *"follow good practices"* is a
minion nobody listens to. One who knows your module boundaries and your analyzer rules catches real
bugs. Setup is where that difference gets filled in — and Claude can do it for you by reading your
repos.

```bash
git clone git@github.com:omernoach/go-command-generic.git go-command
cd go-command
```

Then open Claude Code in that directory and say:

> ### 🍌 *"read SETUP.md and set this up for my repos"*

It asks which repos to cover — a folder, several folders, or individual paths, whatever your
layout is. Then it reads their `AGENTS.md`/`CLAUDE.md` files and your existing skills, infers your
stacks, package managers, test commands, ticket prefix and branch conventions, asks about the
handful of things it can't detect, fills every placeholder, and runs `./install.sh`. Expect one
round of questions, a few liveness probes, and a summary of anything it had to guess.

Prefer to do it by hand? `grep -rn "{{" agents commands` lists every decision, and each one sits
next to a `<!-- SETUP: -->` comment explaining what good looks like. Then run `./install.sh`.

### Where to install

`./install.sh` asks. Or skip the wizard:

```bash
./install.sh --claude                 # ~/.claude — one install, every repo, full crew
./install.sh --cursor <repo>...       # .cursor/commands in the repos you name
./install.sh --both <repo>...
```

Everything is symlinked, never copied, so `git pull` updates your whole crew with no reinstall.
Clone the repo anywhere — the script finds its own location.

**Claude Code** is where the crew works properly: `/go` delegates each phase to a real subagent
with its own context, model and tool permissions.

**Cursor** has no subagent primitive and no global command directory, so the install is per repo
and the four minions land in `.cursor/commands/` alongside `/go` — invocable by hand (`/reviewer`),
but `/go` can't delegate to them. It runs all four inline in one context instead, which costs you
context isolation, per-agent models, and read-only enforcement on the reviewer. It works; it isn't
the full crew.

---

## 🍌 What the minions need from you

| Placeholder | Lives in | Why it matters |
|---|---|---|
| `{{TICKET_PREFIX}}` `{{DEFAULT_BRANCH}}` `{{BRANCH_FORMAT}}` | `go.md` | Branch names a push hook won't reject *after* all the work is done |
| `{{STACK_DETECTION}}` | `go.md` + all four | One check telling the crew which repo they're in — keep every copy identical |
| `{{STACK_CONVENTIONS}}` | `reviewer.md` | **Kevin's brain. The highest-value section in the repo.** See below 👇 |
| `{{STACK_GOTCHAS}}` | `plan-reviewer.md` | The tooling-enforced rules that fail late and loudly |
| `{{TEST_COMMANDS}}` `{{AFFECTED_DETECTION}}` | `test-runner.md` | Exact commands + env vars — a missing env var looks exactly like a real failure |
| `{{TRACKER_TOOLS}}` `{{TRACKER_CONFIG}}` | `ticket-planner.md`, `create-ticket.md` | Which tracker, and MCP tool names that *actually resolve* |
| `{{IMPLEMENT_RULES}}` `{{PR_POLICY}}` `{{POST_SHIP_STEP}}` | `go.md` | How your team writes and ships a change |
| `{{PERSONA}}` | everywhere | The minion theme. Keep it 🍌 — or re-theme all four together |

### 👔 The one section worth real effort

`agents/reviewer.md` → **Step 3: Stack-Specific Conventions**. Write the rules your team actually
comments on in review — the ones a new hire gets wrong — not generic clean-code advice. Aim for
6–10 checkboxes per stack, and prefer rules that *something enforces*:

> 🍌 ❌ "Follow good practices in the service layer"
>
> 🍌 ✅ "Handlers must go through the base class's `Execute()` wrapper; one without a registered
> request validator fails the build — the analyzer catches it"

The second kind is objectively checkable, so Kevin can't hedge — and it usually already exists,
written down in your `AGENTS.md`. Setup pulls from there first.

---

## 🍌 Works in any repo

`/go` and all four minions detect the stack once and adapt. Anything unrecognised falls back to the
repo's own `AGENTS.md` / `CLAUDE.md`, so pointing the crew at a new repo needs no changes here — it
just gets sharper once you add that stack to the conventions blocks.

## 🍌 Banana upgrades

Worth adding once the basics work:

- **An `AGENTS.md` in each repo**, if you don't have one. All four minions read it, so it's the
  cheapest way to make the whole crew smarter at once — and it helps every other tool you use.
- **A post-ship artifact step** (`{{POST_SHIP_STEP}}`) if you have something to build for local
  testing. Gate it on the diff actually touching that code, or you pay for it on every PR.
- **Companion-PR rules**, if a change here ever needs a change in an infra or config repo. That's
  the classic thing discovered *after* merge.
- **Skills** for repetitive multi-step tasks in your domain — Phase 1.75 loads them automatically.
- **Feed review misses back to Kevin.** When a human catches something Kevin missed, add it to
  `reviewer.md` and commit. That file is what compounds.

## 🍌 Requirements

Claude Code, `git`, and `gh` for PRs. A tracker MCP (Jira, Linear, …) is only needed for the ticket
steps — everything else works without one.
