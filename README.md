<div align="center">

<img src="https://media.tenor.com/A3lLdiPt95AAAAAM/work-minions.gif" width="320" alt="minions working">

# 🍌 go-command 🍌

### **Bello, Boss Gru!** One command. Ticket → reviewed draft PR.

*They grill you about the design, write the plan, build it task by task, review it, and ship it
as a draft. You eat da banana.* 🍌

</div>

```
/go PROJ-1234              # worktree → grill → plan → subagents → draft PR → review → review bot
/go PROJ-1234 fix-auth     # same, branch PROJ-1234-fix-auth
/go Fix the login crash    # no ticket? one gets created first
/go PROJ-1234 autopilot    # bee do bee do — no grill, decisions recorded as Assumptions
```

Built on [superpowers](https://github.com/obra/superpowers) (`writing-plans`,
`subagent-driven-development`) and [Matt Pocock's skills](https://github.com/mattpocock/skills)
(`grilling`, `domain-modeling`). The main session only coordinates: exploration, implementation,
review and bot-comment fixes all run in subagents.

---

## 🍌 The flow

0. **Model check.** Planning is best on Opus.
1. **Target repo.**
2. **Worktree** from a fresh `origin/<default>`, at `../worktrees/<ticket>`.
3. **Ticket.** Bob fetches it.
4. **Grill.** One question at a time, each with a recommended answer. Anything the code can answer
   goes to Explore subagents instead of you. A reference-feature checklist comes back from a
   subagent, and `CONTEXT.md` is updated as terms settle.
5. **Plan.** Every task is self-contained enough for a fresh subagent. Carl checks the plan once
   against the code. The plan carries a handoff block, so a fresh session can run it too.
6. **Execute.** One implementer per task, a review per task, and an explicit model on every
   dispatch.
7. **Draft PR first, then Kevin's high-effort review**, so CI runs while the review does.
8. **Review-bot loop.** 5 minutes after each push, small bot-comment fixes are applied and the rest
   are escalated.

<div align="center">

| | | Minion | Agent | What they do |
|---|---|---|---|---|
| 🥽 | **Bob** | *the eager one* | `ticket-planner` | Reads the ticket |
| 🔍 | **Carl** | *the pessimist* | `plan-reviewer` | Opens every file the written plan assumes, before a line is written |
| 👔 | **Kevin** | *the tall one* | `reviewer` | High-effort `code-review` of the branch: bugs, security, dead code, missing tests |

</div>

---

## 🍌 Setup

```bash
git clone git@github.com:omernoach/go-command-generic.git go-command
cd go-command
```

Then open Claude Code in that directory and say:

> ### 🍌 *"read SETUP.md and set this up for my repos"*

It finds your ticket prefix, default branch, workspace root, tracker and review bot, asks about
whatever it can't detect, fills every placeholder, and runs `./install.sh`.

Prefer to do it by hand? `grep -rn "{{" agents commands` lists every decision, and each one sits
next to a `<!-- SETUP: -->` comment. Then run `./install.sh`.

```bash
./install.sh --claude                 # ~/.claude — one install, every repo
./install.sh --cursor <repo>...       # .cursor/commands in the repos you name
./install.sh --both <repo>...
```

Everything is symlinked, so `git pull` updates the crew with no reinstall. `--claude` also installs
the `superpowers` and `mattpocock-skills` plugins, and removes links to agents that no longer exist.

## 🍌 What the minions need from you

| Placeholder | Lives in | Why it matters |
|---|---|---|
| `{{TICKET_PREFIX}}` `{{DEFAULT_BRANCH}}` | `go.md`, `ticket-planner.md` | Branch names and worktree base |
| `{{WORKSPACE_ROOT}}` | `go.md` | Where Step 1 looks for your repos |
| `{{REVIEW_BOT_LOGIN}}` | `go.md` | The bot whose PR comments Step 8 auto-fixes, e.g. `cursor[bot]`. None? Delete Step 8 |
| `{{TICKET_DEFAULTS}}` | `go.md` | Default `/create-ticket` flags for quick wins |
| `{{TRACKER_CONFIG}}` | `ticket-planner.md` | How Bob fetches a ticket |
| `{{TRACKER}}` `{{TRACKER_PROJECT}}` `{{TRACKER_SITE}}` `{{DEFAULT_BOARD}}` `{{DEFAULT_ASSIGNEE}}` | `create-ticket.md` | Where quick-win tickets land |
| `{{PERSONA}}` | `go.md` | The minion theme. Keep it 🍌, or re-theme all three agents together |

## 🍌 Requirements

**Claude Code**, plus `git` and `gh`. A tracker MCP (Jira, Linear, …) is only needed for the ticket
steps.

Cursor works, but without most of what makes the flow fast. It has no subagents and no
`ScheduleWakeup`, so `/go` runs every step inline in one context, and the timers become background
`sleep`s.
