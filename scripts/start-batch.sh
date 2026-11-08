#!/usr/bin/env bash
# Start a batch: one worktree, branch and Claude session per batch session.
#
#   scripts/start-batch.sh NN [--dry-run]
#
# Checks that local dev matches origin/dev, that docs/batches/batch-NN/batch.md is on origin/dev
# and that every decision in it has an answer. Then, for each session (A, B, C…) in the Summary
# table, creates ../<repo>-batch-NN-<x> on a new branch batch-NN-<x> from origin/dev (skipped if
# it exists) and opens a Terminal.app window there running claude. See docs/Batch-workflow.md.
#
# Written for macOS: bash 3.2 (no mapfile, no associative arrays) and Terminal.app.

set -euo pipefail

dry_run=0
nn=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=1 ;;
    *) nn="$arg" ;;
  esac
done

die() { echo "start-batch: $*" >&2; exit 1; }

[[ "$nn" =~ ^[0-9]{1,2}$ ]] || die "usage: scripts/start-batch.sh NN [--dry-run]"
nn=$(printf '%02d' "$((10#$nn))")

top=$(git rev-parse --show-toplevel)
cd "$top"
repo=$(basename "$top")
batch_file="docs/batches/batch-$nn/batch.md"

# Prints the command in dry-run mode, runs it otherwise.
run() {
  if (( dry_run )); then
    printf '[dry-run]'; printf ' %q' "$@"; printf '\n'
  else
    "$@"
  fi
}

# --- dev is up to date --------------------------------------------------------------------------

# Fetching only updates remote-tracking refs, so it runs in dry-run mode too: without it the
# checks below would be against a stale origin/dev.
git fetch --quiet origin
git rev-parse --verify --quiet refs/heads/dev >/dev/null || die "no local dev branch"

if [[ $(git rev-parse dev) != $(git rev-parse origin/dev) ]]; then
  read -r ahead behind < <(git rev-list --left-right --count dev...origin/dev)
  die "local dev is $ahead ahead and $behind behind origin/dev. Bring it level first
  (git switch dev && git pull --ff-only, or push your commits)."
fi

# --- the batch file exists on origin/dev --------------------------------------------------------

# Read from origin/dev, not the working copy: the worktrees are created from origin/dev, so that
# is the version the sessions will read.
git cat-file -e "origin/dev:$batch_file" 2>/dev/null \
  || die "$batch_file is not on origin/dev. Commit and push it to dev first."
batch=$(git show "origin/dev:$batch_file")

# --- every decision is answered -----------------------------------------------------------------

# Within "## Decisions needed", each "### D-xx" heading needs an "Answer:" line with text after
# it (bold "**Answer:**" accepted). A heading with no Answer: line at all counts as unanswered.
unanswered=$(awk '
  function flush() { if (heading != "" && !answered) print "  " heading; heading = "" }
  /^## /            { flush(); in_section = ($0 ~ /^## Decisions needed/); next }
  !in_section       { next }
  /^### D-/         { flush(); heading = substr($0, 5); answered = 0; next }
  /^[*]*Answer:/    {
    rest = $0
    sub(/^[*]*Answer:[*]*/, "", rest)
    gsub(/[ \t]/, "", rest)
    if (rest != "") answered = 1
  }
  END { flush() }
' <<<"$batch")

if [[ -n "$unanswered" ]]; then
  die "these decisions in $batch_file have no answer:
$unanswered
Fill in their Answer: lines on dev, push, and run this again."
fi

# --- sessions -----------------------------------------------------------------------------------

# The Session column of the "## Summary" table, located by its header so column order can change.
# Big tasks carry "–" there and are skipped: they run interactively, not in a batch session.
sessions=$(awk -F'|' '
  /^## /       { in_section = ($0 ~ /^## Summary/); next }
  !in_section  { next }
  col == 0 && /^\|/ {
    for (i = 1; i <= NF; i++) { h = $i; gsub(/[ \t]/, "", h); if (h == "Session") col = i }
    next
  }
  col && /^\| *T-/ {
    s = $col; gsub(/[ \t]/, "", s)
    if (s ~ /^[A-Z]$/) print s
  }
' <<<"$batch" | sort -u)

[[ -n "$sessions" ]] || die "no sessions found in the Session column of the Summary table in $batch_file"

echo "Batch $nn: sessions $(echo $sessions)"

# --- one worktree and Claude session each -------------------------------------------------------

for s in $sessions; do
  x=$(echo "$s" | tr 'A-Z' 'a-z')
  branch="batch-$nn-$x"
  path="$(dirname "$top")/$repo-batch-$nn-$x"

  if git rev-parse --verify --quiet "refs/heads/$branch" >/dev/null || [[ -e "$path" ]]; then
    echo "Session $s: $branch or $path already exists, not creating it."
    if git rev-parse --verify --quiet "refs/heads/$branch" >/dev/null \
        && ! git merge-base --is-ancestor origin/dev "$branch"; then
      echo "  warning: $branch does not contain origin/dev; the session must rebase onto origin/dev."
    fi
  else
    echo "Session $s: creating $branch at $path"
    run git worktree add --quiet -b "$branch" "$path" origin/dev
    run pnpm --dir "$path" install --silent
  fi

  # The window is opened for an existing worktree too, so running this again resumes a session.
  prompt="You are session $s of $batch_file. Read docs/Batch-workflow.md, then implement your tasks in order."
  # Single quotes are safe around the prompt: it is built above and contains none.
  cmd="cd $(printf '%q' "$path") && claude '$prompt'"
  if (( dry_run )); then
    echo "[dry-run] open a Terminal.app window running: $cmd"
  else
    # The command goes in as an argv item, so AppleScript never has to parse its quotes.
    osascript \
      -e 'on run argv' \
      -e 'tell application "Terminal" to do script (item 1 of argv)' \
      -e 'end run' \
      "$cmd" >/dev/null
  fi
done

if (( dry_run )); then
  echo "Dry run: nothing was created or opened."
fi
