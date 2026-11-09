# Plan: `scripts/review-batch.sh` and the review-pass doc fixes

Status: **built 2026-11-08**, with three decisions changed from the outline below:
- The review is posted **on each PR** (`gh pr review --comment`), not in a `review.md` on `dev`.
- Reviewers start **automatically**: `start-batch.sh` chains `review-batch.sh NN --session S` after
  each implementer, and they run **in parallel**, each on its own ports.
- The integration result is posted as a comment on every PR, with the merge order Pol follows.

The code (`scripts/review-batch.sh`) and `docs/Batch-workflow.md` are the authority now; the rest
of this file is the original plan, kept as the record of why.

## Why

`docs/Batch-workflow.md` says what the review pass checks, but leaves open:

1. **How it starts.** There is no script or fixed prompt, unlike `start-batch.sh`.
2. **Where fixes go.** It says "review session in the main checkout", but mechanical fixes belong
   on the `batch-NN-<s>` branches, so the PRs carry them.
3. **Where `review.md` is committed.**
4. **Merge conflicts.** The hotspot table says "the review pass resolves merge conflicts", but
   merging is Pol's step (Running a batch, step 3).

## Decisions so far (agreed with Pol in chat, still open to change)

- **Review each branch in its own worktree** (`../<repo>-batch-NN-<s>`). It already has the branch
  checked out and `pnpm install` done, and a fix committed and pushed there updates the PR.
- **The main checkout stays on `dev` as the baseline** for the screenshot diff (`shots:capture` /
  `shots:diff`) and the engine `Output:` comparison. Nothing is edited there except `review.md`.
- **One extra integration worktree** (`../<repo>-batch-NN-review`) with every batch branch merged
  onto `origin/dev`. Test, typecheck and both builds run there. That is where cross-session breaks
  show up. **The reviewer reports conflicts and does not resolve them**; the merge stays Pol's.
- **Sequential, not parallel.** The editor dev server (5174) and the screenshot harness clash if
  two reviewers run at once. The reviewer is a fresh session, never one of the implementers.
- **`review.md` is committed to `dev` and pushed**, like `batch.md`. That keeps `dev` level with
  `origin/dev`, which `start-batch.sh` requires.
- **A script, not a skill.** The checklist stays in `Batch-workflow.md` as the one source of
  truth; a skill would duplicate it and drift.

## Still to settle

- **Where the reviewer's Claude starts.** Claude Code asks permission before editing outside its
  starting folder. Options:
  - (a) One session started in the main checkout with `--add-dir` for every session worktree and
    the integration worktree.
  - (b) One session per worktree, opened one after another. A last step writes `review.md` in the
    main checkout.

  Leaning (b): each session has one branch in front of it and can't commit to the wrong one. The
  cost is more windows and a merge step for `review.md`. Check which permission settings
  (`.claude/settings.json`) each option needs.
- Whether the script waits for the implementing sessions to exit, or only warns.

## Script outline (`scripts/review-batch.sh NN [--dry-run]`)

Match `start-batch.sh`: bash 3.2, Terminal.app via `osascript`, `run()` for dry-run, `die()`.

1. `git fetch`; `dev` == `origin/dev` (same check as start-batch).
2. Read the sessions from `batch.md` on `origin/dev` (reuse start-batch's awk for the Summary table).
3. For each session: its branch is pushed, has an open PR, the PR base is `dev`
   (`gh pr list --head batch-NN-<s> --json number,baseRefName,state`), and the worktree has no
   uncommitted changes. Refuse otherwise, listing every failure, not just the first.
4. Warn (or refuse) if a `claude ... You are session <S> of <batch_file>` process is still running.
5. Create the integration worktree from `origin/dev`. Merge each `origin/batch-NN-<s>` with
   `--no-ff`, and on a conflict record the files and `git merge --abort`. Run `pnpm install`.
6. Open the reviewer session(s) with a fixed prompt naming the batch, the worktrees, the
   integration result and `docs/Batch-workflow.md` §Review pass.

## Doc changes (`docs/Batch-workflow.md`)

- §Review pass: where it runs (the decision above), where fixes go (the session's worktree,
  committed and pushed to the PR branch), that the integration worktree exists, and that
  `review.md` is committed to `dev`.
- Hotspot table: "the review pass resolves merge conflicts" becomes "the review pass reports
  merge conflicts; Pol resolves them when merging".
- §Running a batch step 2: run `scripts/review-batch.sh NN --dry-run`, then without `--dry-run`.
- `scripts/end-batch.sh`: also remove `batch-NN-review` (the integration worktree and its branch)
  once every PR is merged. Update its header comment.

## Done when

- `scripts/review-batch.sh 01 --dry-run` prints the right checks and actions for batch 01.
- The doc and both scripts agree with each other. Re-read all three before you call it done.
