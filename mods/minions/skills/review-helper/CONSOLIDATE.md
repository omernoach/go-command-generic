# Consolidate

Merge several reviews of one PR into a single source-checked list. Take no report at face value: validate external findings (review threads already on the PR) to the same standard as the internal ones, by reading the code in the worktree.

## Buckets

- **keep**: a real correctness or reliability issue, a design problem that will bite, or a simplification worth asking for.
- **nitpick**: anything a review would otherwise omit as low-value, speculative, optional, already disclosed, process-only, or preference. A nitpick is not a defect.
- **drop**: only claims that are wrong about the code, or exact duplicates after merge. Not listed.

## Classes

Exactly one per item: correctness / reliability, maintainability / design, simplification, optional suggestion. Subjective preference is a nitpick.

## Rules

- Deduplicate across all sources, internal and external. Resolve contradictions by reading the code. Keep useful findings unique to any source.
- Challenge the author's choices and the existing patterns the PR follows. An established pattern is not automatically correct.

## External overlap

For each external finding on the same underlying issue as an internal one (same file or behavior, even if worded differently):

- **sufficient**: the external comment is accurate and detailed enough. Add no duplicate finding; record the thread URL.
- **expand**: right issue, but the explanation is incomplete, inaccurate, or misses a consequence. Add no duplicate top-level finding; record the thread URL and a reply draft carrying the missing context. Still bucket it.
- **distinct**: similar wording, materially different issue. Keep it separate and state the difference.

A wrong external finding is dropped.

## Output

One list, no report prose. Per item: location, claim, class, bucket, code evidence, and optional overlap (sufficient / expand / distinct, thread URL, reply draft for expand).

Done when every item is bucketed and tied to a file or function you opened.
