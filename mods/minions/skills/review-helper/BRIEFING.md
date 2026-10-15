# Briefing format

Write for a reader who has not opened the PR. Explain for someone new to this code path; prefer concrete examples to abstract statements.

## Orientation

Short, from the Step 2 notes, not from the findings: what the PR does, the approach, which parts of the system change, and any architectural or behavioral context needed before reviewing.

## Findings

**keep** items, grouped by class, empty groups omitted. An `overlap: sufficient` item gets one line linking its existing thread. Every other finding:

```markdown
### <short title>
- **Class:** correctness / reliability | maintainability / design | simplification | optional
- **What:** <the issue, in plain language>
- **Why it matters here:** <why it matters in this specific PR>
- **Where:** <file / function / code path>
- **Pattern:** <small code example or simplified equivalent, when useful>
- **Use case:** <concrete execution example of how it could show up>
- **Look at:** <what to inspect in that section of the PR>
- **Fix direction:** <a direction, without over-prescribing when several fixes are reasonable>
```

## Nitpicks

Same template, every title prefixed `nitpick:`. The user decides which to raise.

No keep findings: say so and still list the nitpicks. Both buckets empty: say so and still give the orientation plus the few files worth a look.

## Raising on the PR

Presentation only:

- **Already on thread**: sufficient overlaps, linked. No need to repeat.
- **Reply on thread (draft)**: expand overlaps, with the thread link and reply text to paste.
- **Distinct**: raise separately despite similar wording.

## Inspect yourself

A short list of places to open: keep findings first, then nitpicks worth raising. Close with one accounting line instead of the raw reports:

`raw code-review N, ponytail M, external (none|K threads) -> kept K', nitpick P`
