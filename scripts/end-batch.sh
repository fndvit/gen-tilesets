#!/usr/bin/env bash
# End a batch: remove the worktrees and local branches whose PRs are merged into dev.
#
#   scripts/end-batch.sh NN [--dry-run]
#
# Looks at every local branch batch-NN-*, with or without a worktree. A branch whose PR into dev
# is merged loses its worktree and its local branch; every other one is listed with the reason
# it was kept, and the script exits 1. See docs/Batch-workflow.md, "Running a batch".

set -euo pipefail

dry_run=0
nn=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=1 ;;
    *) nn="$arg" ;;
  esac
done

die() { echo "end-batch: $*" >&2; exit 1; }

[[ "$nn" =~ ^[0-9]{1,2}$ ]] || die "usage: scripts/end-batch.sh NN [--dry-run]"
nn=$(printf '%02d' "$((10#$nn))")

cd "$(git rev-parse --show-toplevel)"
command -v gh >/dev/null || die "gh is not installed; it is how merged PRs are found"

run() {
  if (( dry_run )); then
    printf '[dry-run]'; printf ' %q' "$@"; printf '\n'
  else
    "$@"
  fi
}

git fetch --quiet --prune origin

branches=$(git for-each-ref --format='%(refname:short)' "refs/heads/batch-$nn-*")
if [[ -z "$branches" ]]; then
  echo "No local batch-$nn-* branches. Nothing to do."
  exit 0
fi

# The worktree, if any, that has the branch checked out.
worktree_of() {
  git worktree list --porcelain | awk -v ref="refs/heads/$1" '
    /^worktree / { path = substr($0, 10) }
    $0 == "branch " ref { print path }
  '
}

kept=""
for branch in $branches; do
  # gh, not `git branch --merged`, decides: a squash or rebase merge leaves no ancestry behind,
  # and local dev may not have pulled the merge yet.
  pr=$(gh pr list --head "$branch" --base dev --state merged --json number --jq '.[0].number // empty')

  if [[ -z "$pr" ]]; then
    why=$(gh pr list --head "$branch" --state all --json number,state,baseRefName \
      --jq '.[] | "PR #\(.number) \(.state | ascii_downcase), base \(.baseRefName)"' | paste -sd ';' -)
    kept+="  $branch: ${why:-no PR}"$'\n'
    continue
  fi

  path=$(worktree_of "$branch")
  if [[ -n "$path" ]]; then
    # Never --force: a dirty worktree has work nobody has seen, so it is reported and kept.
    if ! run git worktree remove "$path"; then
      kept+="  $branch: PR #$pr merged, but $path has uncommitted or untracked files"$'\n'
      continue
    fi
  fi
  # -D, not -d: -d checks ancestry against local HEAD, which a squash merge or an un-pulled dev
  # would fail even though the PR is merged.
  run git branch --quiet -D "$branch"
  echo "$( (( dry_run )) && echo 'would remove' || echo removed ) $branch (PR #$pr)${path:+, worktree $path}"
done

if [[ -n "$kept" ]]; then
  echo
  echo "Kept, not merged into dev:"
  printf '%s' "$kept"
  exit 1
fi
