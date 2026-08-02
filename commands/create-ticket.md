---
name: Create Ticket
description: "Create a ticket in the team's issue tracker. Usage: /create-ticket <description> [--board <name>] [--assign <name/email>] [--type Task|Story|Bug]"
---

# /create-ticket

Create a ticket in the team's issue tracker, optionally placing it in a board's active sprint.

<!-- SETUP: {{TRACKER}} — this file is written for Jira via the Atlassian MCP. If you use a
     different tracker, keep the input contract identical (/go depends on it returning a ticket ID)
     and swap the steps below:
       Linear:        mcp__linear__create_issue
       GitHub Issues: gh issue create --title ... --body ... --assignee @me
       No tracker:    delete this file and remove the ticket-creation bullet from go.md's
                      QUICK WIN flow, deriving the branch name from the description instead. -->

## Setup Values

| Value | Yours | Example |
|---|---|---|
| Project key | `{{TRACKER_PROJECT}}` | `PROJ` |
| Site / cloud ID | `{{TRACKER_SITE}}` | `<uuid>` or `acme.atlassian.net` |
| Default board | `{{DEFAULT_BOARD}}` | `Platform` — or blank for backlog |
| Default assignee | `{{DEFAULT_ASSIGNEE}}` | the current user |

## Input

Parse the input after `/create-ticket`. All flags optional:

| Flag | Description | Default |
|------|-------------|---------|
| `--board <name>` | Board whose active sprint the ticket joins | `{{DEFAULT_BOARD}}`, else backlog |
| `--assign <name or email>` | Assignee | `{{DEFAULT_ASSIGNEE}}` |
| `--type <type>` | Issue type: Task, Story, Bug | Task |

**Remaining text** is the task description. Derive from it:
- **Summary**: a concise, tracker-style title
- **Description**: the full input as the body

Examples:
- `/create-ticket Add a dark mode toggle`
- `/create-ticket Fix login crash --type Bug --board Platform`
- `/create-ticket Refactor auth middleware --assign teammate@example.com`

## Steps

### 1. Resolve the assignee

Look up the assignee's account ID from their email or name. Skip if unassigned.

### 2. Find the board's active sprint

If a board is set, find its open sprint. Skip if none — the ticket goes to the backlog.

### 3. Get issue type metadata

Fetch the project's issue types and match the `--type` value to its ID.

### 4. Create the ticket

Create it with project key, issue type, summary, description, assignee, and sprint. If the sprint
field can't be set at creation time, move the ticket into the sprint afterwards.

### 5. Report

```
Created {TICKET_KEY}: {summary}
Assigned to: {assignee or "Unassigned"}
Sprint: {sprint or "Backlog"}
Link: {url}
```

Return the ticket key (e.g. `{{TRACKER_PROJECT}}-1234`) so the caller can use it — `/go` depends on
this.
