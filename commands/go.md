---
name: Go
description: "Full workflow in one command: plan, validate the plan, implement, review, test, PR. Use /go <TICKET-ID> for tracked work or /go <description> for quick wins. Add 'autopilot' for fully autonomous execution."
---

# /go

You are the orchestrator. You coordinate four specialist agents — Planner (`ticket-planner`),
Validator (`plan-reviewer`), Reviewer (`reviewer`), and Tester (`test-runner`) — through the full
development workflow, from ticket to pull request.

<!-- SETUP: {{PERSONA}} — optional. Give the crew a theme and a way to address the user, and echo
     the same theme in the four agent files. A consistent voice makes long autonomous runs far
     easier to skim. Delete this comment once decided. -->

## Setup Values

<!-- SETUP: fill these in once; everything below refers to them. See SETUP.md. -->

| Value | Yours | Example |
|---|---|---|
| Ticket prefix | `{{TICKET_PREFIX}}` | `ENG`, `PROJ`, `IL` |
| Default branch | `{{DEFAULT_BRANCH}}` | `main` |
| Branch name format | `{{BRANCH_FORMAT}}` | `{{TICKET_PREFIX}}-1234-short-kebab-description` |

## Input Parsing

Parse the user's input after `/go`:

1. **Check for `autopilot`** anywhere in the input. If present, remove it and set mode to AUTOPILOT.
   Otherwise mode is INTERACTIVE.
2. **Check for a ticket ID** matching `{{TICKET_PREFIX}}-\d+`. If present, this is a TICKET flow.
3. **If no ticket ID**, this is a QUICK WIN flow — the remaining input is the task description.

Examples:

- `/go {{TICKET_PREFIX}}-123456` → INTERACTIVE + TICKET
- `/go {{TICKET_PREFIX}}-123456 autopilot` → AUTOPILOT + TICKET
- `/go Add a colour picker to the settings page` → INTERACTIVE + QUICK WIN
- `/go autopilot Add a colour picker to the settings page` → AUTOPILOT + QUICK WIN

---

## Phase 0: Setup Worktree

Every run gets its own isolated worktree, so a background run never disturbs the current workspace.

1. Verify `.worktrees` is gitignored:

   ```bash
   git check-ignore -q .worktrees 2>/dev/null
   ```

   If NOT ignored, add `.worktrees` to `.gitignore` and commit.

2. Determine the branch name using **Branch name format** above. Both flows use a real ticket ID —
   the QUICK WIN flow creates one in Phase 1.

   <!-- SETUP: if your remote enforces a branch-name pattern (a pre-receive hook, a protected-branch
        rule), state it here — including the escape hatch for ticketless work. Getting this wrong
        fails at push time, after all the work is done. -->

3. Create the worktree and install dependencies with whatever package manager the repo actually
   uses — detect, don't assume:

   ```bash
   git worktree add ".worktrees/$BRANCH_NAME" -b "$BRANCH_NAME"
   cd ".worktrees/$BRANCH_NAME"
   [ -f pnpm-lock.yaml ] && pnpm install \
     || { [ -f yarn.lock ] && yarn install; } \
     || { [ -f package-lock.json ] && npm ci; } \
     || { [ -f uv.lock ] && uv sync; } \
     || { [ -f poetry.lock ] && poetry install; } \
     || true
   ```

4. Detect the stack once. Rules below marked **[<stack> only]** apply to that stack alone:

   ```bash
   ls nx.json *.sln go.mod Cargo.toml pyproject.toml 2>/dev/null; ls -d services apps 2>/dev/null
   ```

   <!-- SETUP: {{STACK_DETECTION}} — replace with the checks that distinguish YOUR repos, and name
        each result. Two or three named stacks is plenty. Example:
          nx.json + apps/browser/  → FRONTEND
          *.sln + services/        → BACKEND
          anything else            → OTHER (follow that repo's own AGENTS.md/CLAUDE.md) -->

   If nothing matches, treat it as **OTHER**: follow the repo's own `AGENTS.md` / `CLAUDE.md` and
   skip every stack-specific rule.

5. Report: "Worktree ready at `.worktrees/$BRANCH_NAME`."

---

## Phase 1: Plan

### TICKET Flow

- Delegate to the Planner (`ticket-planner` agent) with the ticket ID
- The Planner fetches the ticket, explores the codebase, and produces:
  - Summary (what, why, acceptance criteria)
  - 2-3 approaches with **(Recommended)** marked
  - Task breakdown

### QUICK WIN Flow

- **First, create a ticket** by invoking `/create-ticket <task description>`. The returned ticket ID
  becomes the TICKET ID for the rest of the workflow.

  <!-- SETUP: {{TICKET_DEFAULTS}} — add your default flags here (board/sprint/assignee/type) so
       quick wins land where your team expects. If you don't use a tracker at all, delete this
       bullet and derive the branch name from the description instead. -->
- Then analyze the task description directly in the main context
- Load any relevant skills — they auto-trigger based on the task area
- Produce 2-3 approaches with **(Recommended)** marked

### Approach Selection

- **INTERACTIVE mode**: Use AskUserQuestion to ask which approach to take. Wait for the response.
- **AUTOPILOT mode**: Automatically select the approach marked **(Recommended)** and announce it.

---

## Phase 1.5: Plan Review (Validator)

After approach selection and BEFORE implementation, delegate to the Validator (`plan-reviewer`
agent) to check the chosen approach against the actual codebase.

This phase exists because the most expensive failure mode is a plan that reads well and rests on an
assumption nobody opened a file to confirm.

- The Validator receives the chosen approach and explores the codebase to verify it
- It checks:
  - Every hook point, integration point, or extension mechanism the plan assumes actually behaves that way
  - All callers and triggers of the touched code paths — any unintended side effects?
  - Whether a simpler approach reaches the same goal with fewer changes
  - Whether similar patterns in this codebase have known gotchas

- It reports one of:
  - **BLOCKER**: Fundamental flaw — the approach won't work. Includes why, and a simpler alternative.
  - **RISK**: Works, but has edge cases. Includes specific mitigations.
  - **CLEAN**: Sound. Proceed.

- If **BLOCKER**:
  - **INTERACTIVE**: Present the findings and the alternative to the user
  - **AUTOPILOT**: Switch to the Validator's simpler alternative automatically
- Max 1 cycle — if the alternative also blocks, escalate to the user

---

## Phase 1.75: Load Skills

Before writing any code, review the available skills and load every one relevant to the task.
Skills carry codebase-specific conventions that prevent review cycles — skipping them produces code
that compiles and then gets rejected in review.

---

## Phase 2: Implement

Work inside the worktree.

1. Implement the chosen approach following these guidelines:
   - Implement the FULL scope — no partial work
   - Prefer the smallest change that solves the problem
   - Update affected tests when changing strings, labels, enums, structure, or feature flags
   - Follow the conventions in the nearest `AGENTS.md` / `CLAUDE.md` — repo root **and** the
     directory being edited

   <!-- SETUP: {{IMPLEMENT_RULES}} — add your stack-specific implementation rules here, each
        prefixed with the stack it applies to so other repos skip it. Examples:
          - **[FRONTEND only]** Use the design-system components, not raw HTML
          - **[FRONTEND only]** Module A must not import from module B, and vice versa
          - **[BACKEND only]** If the root cause is in another service, say so — don't work around it
        Rules that apply everywhere need no prefix. -->

2. After implementation, show a summary of changes:

   ```bash
   git diff --stat
   ```

---

## Phase 3: Review (Reviewer)

Delegate to the Reviewer (`reviewer` agent) to review the changes.

- It runs `git diff` in the worktree and checks against the repo's conventions
- If it reports **CRITICAL** issues: fix them, then re-delegate (max 2 review cycles total)
- If only warnings/suggestions: proceed, and mention them in the PR description

---

## Phase 4: Test (Tester)

Delegate to the Tester (`test-runner` agent) to run tests.

- It detects the stack, determines the affected projects, and runs their tests (plus a typecheck
  where the stack has one)
- If it reports **failures**: fix them, then re-delegate (max 2 test cycles total)
- If all pass: proceed

---

## Phase 5: Ship

1. Stage and commit all changes using Conventional Commits:
   - `feat(scope): {{TICKET_PREFIX}}-1234 description` or `fix(scope): {{TICKET_PREFIX}}-1234 description`
   - Both flows use the real ticket ID

2. Push and open a PR:

   ```bash
   git push -u origin $BRANCH_NAME
   ```

   Create the PR with `gh pr create`:
   - Title = `{{TICKET_PREFIX}}-1234 - type(scope): description`
   - Body: the problem, how it was solved, the Reviewer's summary, the Tester's results

   <!-- SETUP: {{PR_POLICY}} — if your team opens PRs as drafts, requires a template, or needs a
        companion PR in another repo (infra, config, schema), state it here. -->

3. <!-- SETUP: {{POST_SHIP_STEP}} — an optional build/artifact step so the user can test the change
        locally after shipping. Gate it on the stack AND on the diff actually touching the relevant
        code, so unrelated changes don't pay for it. Example:
          **[FRONTEND only]** If the diff touches extension code, run `pnpm build:ext`.
          Otherwise skip it and report `Build: skipped` so nobody waits on a dist that isn't coming.
        Delete this step entirely if you have no such artifact. -->

4. Report:

   ```
   Mission complete.

   PR: <url>
   Worktree: .worktrees/<branch>
   Branch: <branch>

   Review: <clean / X warnings>
   Tests:  <all pass / X fixed>
   ```

---

## Rules

- ALWAYS create a worktree — never modify the main workspace
- In AUTOPILOT mode, never use AskUserQuestion — auto-decide everything
- Max 2 review cycles, max 2 test cycles
- If issues remain after 2 cycles, commit anyway but flag them in the PR description
- Don't add markdown documentation files to the PR

<!-- SETUP: {{GLOBAL_RULES}} — add any hard team rules here (e.g. "never edit generated files",
     "always open PRs as drafts", "stop and ask before touching migrations"). -->
