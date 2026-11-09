#!/usr/bin/env bash
# Review a batch: one Claude reviewer per session worktree, posting its review on the session's PR.
#
#   scripts/review-batch.sh NN [--session S] [--dry-run]
#
# start-batch.sh chains this after each implementer exits (`claude …; review-batch.sh NN --session S`),
# so a session's review starts in the same window as soon as its implementer has opened its PR and
# quit. With --session, it checks that one session and runs its reviewer in the current terminal;
# without, it checks every session and opens a Terminal.app window per session that passes.
#
# A session passes when its worktree is clean, its branch is pushed, and it has exactly one open PR
# into dev. Before any reviewer starts, the script prepares two things once per batch, each under a
# lock so two chained runs don't race:
#   - a screenshot baseline of dev, captured from the main checkout into .shots/batch-NN-dev;
#   - once every session has an open PR, an integration worktree ../<repo>-batch-NN-review with
#     every branch merged onto origin/dev in session order, tested and built, its summary posted as
#     a comment on every batch PR. Conflicts are reported, never resolved: merging is Pol's.
# See docs/Batch-workflow.md, "Review pass" and "Running a batch".
#
# Written for macOS: bash 3.2 (no mapfile, no associative arrays) and Terminal.app.

set -euo pipefail

dry_run=0
nn=""
only=""
while (( $# )); do
  case "$1" in
    --dry-run) dry_run=1 ;;
    --session) shift; only="${1:-}" ;;
    *) nn="$1" ;;
  esac
  shift
done

die() { echo "review-batch: $*" >&2; exit 1; }

[[ "$nn" =~ ^[0-9]{1,2}$ ]] || die "usage: scripts/review-batch.sh NN [--session S] [--dry-run]"
nn=$(printf '%02d' "$((10#$nn))")
[[ -z "$only" || "$only" =~ ^[A-Z]$ ]] || die "--session takes one capital letter, e.g. --session A"
command -v gh >/dev/null || die "gh is not installed; it is how PRs are found and reviews posted"

# The chained run starts inside a session worktree, so work from the main checkout: the first entry
# of `git worktree list` is always the main one.
top=$(git worktree list --porcelain | awk '/^worktree /{ print substr($0, 10); exit }')
cd "$top"
repo=$(basename "$top")
batch_file="docs/batches/batch-$nn/batch.md"
integ="$(dirname "$top")/$repo-batch-$nn-review"
integ_branch="batch-$nn-review"
baseline="$top/.shots/batch-$nn-dev"
locks="$(git rev-parse --git-common-dir)"

run() {
  if (( dry_run )); then
    printf '[dry-run]'; printf ' %q' "$@"; printf '\n'
  else
    "$@"
  fi
}

# --- dev is up to date --------------------------------------------------------------------------

# Same check as start-batch.sh. Here it matters twice: the screenshot baseline is captured from this
# checkout's working tree, and the integration worktree starts from origin/dev.
git fetch --quiet origin
[[ $(git symbolic-ref --quiet --short HEAD || true) == dev ]] \
  || die "the main checkout $top is not on dev; the screenshot baseline is captured from it"
if [[ $(git rev-parse dev) != $(git rev-parse origin/dev) ]]; then
  read -r ahead behind < <(git rev-list --left-right --count dev...origin/dev)
  die "local dev is $ahead ahead and $behind behind origin/dev. Bring it level first
  (git switch dev && git pull --ff-only, or push your commits)."
fi
[[ -z $(git status --porcelain --untracked-files=no) ]] \
  || die "the main checkout has uncommitted changes; the baseline would not be dev"

git cat-file -e "origin/dev:$batch_file" 2>/dev/null \
  || die "$batch_file is not on origin/dev"
batch=$(git show "origin/dev:$batch_file")

# --- sessions -----------------------------------------------------------------------------------

# Twin of the Summary-table awk in start-batch.sh; keep the two the same.
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
if [[ -n "$only" ]] && ! grep -qx "$only" <<<"$sessions"; then
  die "session $only is not in $batch_file (sessions: $(echo $sessions))"
fi

echo "Batch $nn: sessions $(echo $sessions)${only:+, reviewing $only}"

lower() { echo "$1" | tr 'A-Z' 'a-z'; }

# --- per-session checks -------------------------------------------------------------------------

# Every session is checked, even with --session: the integration step needs to know whether all of
# them have their PR. Failures are collected so one run lists everything that is wrong.
# Results are kept in plain variables named by session (bash 3.2 has no associative arrays).
all_ready=1
failures=""
waiting=""
for s in $sessions; do
  x=$(lower "$s")
  branch="batch-$nn-$x"
  path="$(dirname "$top")/$repo-batch-$nn-$x"
  fail=""

  if [[ ! -d "$path" ]]; then
    fail+="    no worktree at $path"$'\n'
  elif [[ -n $(git -C "$path" status --porcelain) ]]; then
    fail+="    $path has uncommitted or untracked changes"$'\n'
  fi

  if ! git rev-parse --verify --quiet "refs/remotes/origin/$branch" >/dev/null; then
    fail+="    $branch is not pushed"$'\n'
  elif [[ $(git rev-parse --verify --quiet "refs/heads/$branch" || true) != $(git rev-parse "origin/$branch") ]]; then
    fail+="    local $branch and origin/$branch differ (unpushed commits, or not pulled)"$'\n'
  fi

  prs=$(gh pr list --head "$branch" --state open --json number,url,baseRefName \
    --jq '.[] | "\(.number) \(.url) \(.baseRefName)"')
  pr="" url=""
  if [[ -z "$prs" ]]; then
    fail+="    $branch has no open PR"$'\n'
  elif (( $(wc -l <<<"$prs") > 1 )); then
    fail+="    $branch has more than one open PR"$'\n'
  else
    read -r pr url base <<<"$prs"
    [[ "$base" == dev ]] || fail+="    PR #$pr targets $base, not dev (gh pr edit $pr --base dev)"$'\n'
  fi

  # The implementer must have exited: a reviewer racing one that may still push reviews a moving
  # branch. The pattern is start-batch.sh's implementer prompt; the reviewer's prompt differs.
  if pgrep -f "You are session $s of $batch_file" >/dev/null; then
    fail+="    session $s's implementer is still running"$'\n'
  fi

  eval "pr_$s=\$pr; url_$s=\$url; path_$s=\$path"
  if [[ -n "$fail" ]]; then
    eval "ok_$s=0"
    all_ready=0
    waiting+=" $s"
    failures+="  Session $s ($branch):"$'\n'"$fail"
  else
    eval "ok_$s=1"
    echo "Session $s: $branch ready, PR #$pr"
  fi
done

if [[ -n "$failures" ]]; then
  echo
  echo "Not ready:"
  printf '%s' "$failures" | sed 's/^/FAIL: /'
  if [[ -n "$only" ]] && (( ! $(eval "echo \$ok_$only") )) && (( ! dry_run )); then
    die "session $only is not ready for review. Fix the above and run: scripts/review-batch.sh $nn --session $only"
  fi
fi

# --- locks --------------------------------------------------------------------------------------

# mkdir is atomic, so it is the lock. A run that finds the lock taken waits: the other run is doing
# the same work, and this one needs its result. Locks live in the shared .git directory, which every
# worktree sees.
held_locks=""
release_locks() { local l; for l in $held_locks; do rmdir "$l" 2>/dev/null || true; done; }
trap release_locks EXIT
lock() {
  local l="$locks/review-batch-$nn-$1.lock" waited=0
  until mkdir "$l" 2>/dev/null; do
    (( waited )) || echo "Waiting for another review-batch run ($1)…"
    waited=1
    sleep 5
  done
  held_locks+=" $l"
}
unlock() { local l="$locks/review-batch-$nn-$1.lock"; rmdir "$l"; held_locks=${held_locks/ "$l"/}; }

# --- screenshot baseline ------------------------------------------------------------------------

# One capture of dev for every reviewer to diff against, instead of each reviewer building the demo
# in the same dist/. capture.mjs says to capture both sides in one sitting (a Chrome update moves
# pixels); reviews run the same day as this, which is as close as a shared baseline gets.
# Port 4173 is the demo's default preview port; reviewers get 4183, 4193… so they never clash.
capture_baseline() {
  local demo="$top/apps/demo" log="$baseline.log" pid ok=1
  echo "Baseline: building the demo from dev and capturing into $baseline"
  if (( dry_run )); then
    run pnpm --dir "$top" --filter @vit-foundation/tileset-demo build
    echo "[dry-run] start vite preview --port 4173 --strictPort in $demo"
    run pnpm --dir "$top" --filter @vit-foundation/tileset-demo shots:capture "$baseline" http://localhost:4173/
    echo "[dry-run] stop the preview server, mark $baseline/.done"
    return
  fi
  mkdir -p "$(dirname "$baseline")"
  rm -rf "$baseline"
  pnpm --dir "$top" --filter @vit-foundation/tileset-demo build >"$log" 2>&1 || ok=0
  if (( ok )); then
    # vite directly, not through pnpm, so the pid we kill is the server's own.
    (cd "$demo" && exec node_modules/.bin/vite preview --port 4173 --strictPort) >>"$log" 2>&1 &
    pid=$!
    local tries=0
    until curl -sf -o /dev/null http://localhost:4173/; do
      (( ++tries < 60 )) && kill -0 "$pid" 2>/dev/null || { ok=0; break; }
      sleep 1
    done
    if (( ok )); then
      pnpm --dir "$top" --filter @vit-foundation/tileset-demo shots:capture "$baseline" \
        http://localhost:4173/ >>"$log" 2>&1 || ok=0
    fi
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  if (( ok )); then
    touch "$baseline/.done"
    echo "Baseline: done."
  else
    # Not fatal: the reviewer can still check everything but the renderer, and says so.
    echo "Baseline: FAILED, see $log. Reviewers will report the renderer check as not run." >&2
  fi
}

if [[ -f "$baseline/.done" ]]; then
  echo "Baseline: $baseline exists."
else
  lock baseline
  [[ -f "$baseline/.done" ]] || capture_baseline
  unlock baseline
fi

# --- integration --------------------------------------------------------------------------------

summary="$integ/.review-logs/summary.md"

# Prints the conflicted files of merging $2 into $1 without touching any worktree, and the merged
# tree on the first line. git merge-tree exits 1 on a conflict.
predict_merge() {
  git merge-tree --write-tree --name-only --no-messages "$1" "$2" || true
}

integrate() {
  local logs="$integ/.review-logs" s x branch conflicts order="" verdicts="" checks="" merged_prs=""
  local prev_head tree first

  if (( dry_run )); then
    echo "Integration: predicting merges onto origin/dev in session order (git merge-tree)"
    prev_head=$(git rev-parse origin/dev)
    for s in $sessions; do
      branch="origin/batch-$nn-$(lower "$s")"
      if ! git rev-parse --verify --quiet "$branch" >/dev/null; then
        echo "  $s: $branch not pushed, skipped"; continue
      fi
      out=$(predict_merge "$prev_head" "$branch")
      tree=$(head -n1 <<<"$out")
      conflicts=$(tail -n +2 <<<"$out" | sed '/^$/d' | paste -sd ' ' -)
      if [[ -n "$conflicts" ]]; then
        echo "  $s: CONFLICT in $conflicts"
      else
        echo "  $s: merges cleanly"
        # Chain the predicted result so the next branch is checked against it. commit-tree only
        # writes an unreferenced object, which git gc removes; no ref or worktree changes.
        prev_head=$(git commit-tree "$tree" -p "$prev_head" -p "$branch" -m "review-batch dry run")
      fi
    done
    echo "[dry-run] then: worktree $integ on $integ_branch, pnpm install, test, typecheck, both builds,"
    echo "          changelog check; write $summary and post it on every batch PR"
    return
  fi

  # A leftover worktree without a summary is a run that died half-way: start it again. This is the
  # script's own throwaway merge, never edited by hand, so forcing its removal loses nothing.
  if [[ -e "$integ" ]]; then
    git worktree remove --force "$integ"
  fi
  if git rev-parse --verify --quiet "refs/heads/$integ_branch" >/dev/null; then
    git branch --quiet -D "$integ_branch"
  fi
  # batch-NN-review is local and never pushed: it exists only to test the combined result. Nothing
  # here merges into dev; Pol does every merge.
  echo "Integration: creating $integ from origin/dev"
  git worktree add --quiet -b "$integ_branch" "$integ" origin/dev
  mkdir -p "$logs"

  for s in $sessions; do
    x=$(lower "$s")
    branch="batch-$nn-$x"
    pr=$(eval "echo \$pr_$s")
    order+="${order:+, }#$pr ($s)"
    if git -C "$integ" merge --quiet --no-ff --no-edit -m "Integration: merge $branch" "origin/$branch" \
        >>"$logs/merge.log" 2>&1; then
      verdicts+="- #$pr ($branch): merge as is"$'\n'
      merged_prs+="${merged_prs:+, }#$pr"
    else
      conflicts=$(git -C "$integ" diff --name-only --diff-filter=U | sed 's/^/`/; s/$/`/' | paste -sd ',' - | sed 's/,/, /g')
      git -C "$integ" merge --abort
      verdicts+="- #$pr ($branch): ⚠️ needs dev merged in after ${merged_prs:-the PRs before it} are merged; conflicts in: $conflicts. Left out of the checks below."$'\n'
    fi
  done

  echo "Integration: pnpm install"
  pnpm --dir "$integ" install --silent >"$logs/install.log" 2>&1 || true

  # Each check runs whatever happens to the others, so the summary shows every result.
  check() {
    local name="$1"; shift
    echo "Integration: $name"
    if (cd "$integ" && "$@") >"$logs/$name.log" 2>&1; then
      checks+="- ✅ $name"$'\n'
    else
      checks+="- ❌ $name (log: \`$logs/$name.log\`)"$'\n'
    fi
  }
  check test pnpm test
  check typecheck pnpm typecheck
  check changelog pnpm changelog check
  check build-gen-tilesets pnpm --filter @vit-foundation/gen-tilesets build
  check build-tileset-docs pnpm --filter @vit-foundation/tileset-docs build

  {
    echo "## Integration check: batch $nn"
    echo
    echo "Every batch branch merged onto \`origin/dev\` ($(git rev-parse --short origin/dev)) in session order, in \`$integ\`."
    echo
    echo "**Merge order:** $order. Merge one at a time, in this order, with \"Create a merge commit\"."
    echo "Where every PR says \"merge as is\" and the checks are green, that reproduces the tree tested here."
    echo
    printf '%s' "$verdicts"
    echo
    echo "**Checks on the merged tree:**"
    echo
    printf '%s' "$checks"
  } >"$summary"

  for s in $sessions; do
    gh pr comment "$(eval "echo \$pr_$s")" --body-file "$summary" >/dev/null
  done
  echo "Integration: summary in $summary, posted on every batch PR."
}

if [[ -f "$summary" ]]; then
  echo "Integration: done earlier, $summary"
elif (( all_ready )); then
  lock integration
  [[ -f "$summary" ]] || integrate
  unlock integration
else
  echo "Integration: waiting, not every session is ready:$waiting"
  # The prediction needs no PR, only pushed branches, so the dry run shows it anyway.
  (( dry_run )) && integrate
fi

# --- reviewers ----------------------------------------------------------------------------------

i=0
for s in $sessions; do
  i=$((i + 1))
  [[ -z "$only" || "$s" == "$only" ]] || continue
  (( $(eval "echo \$ok_$s") )) || { echo "Session $s: not ready, no reviewer started."; continue; }

  x=$(lower "$s")
  branch="batch-$nn-$x"
  pr=$(eval "echo \$pr_$s")
  url=$(eval "echo \$url_$s")
  path=$(eval "echo \$path_$s")
  # Own ports per session so reviewers can run side by side; --strictPort makes a clash fail loudly
  # instead of quietly landing on another reviewer's server.
  editor_port=$((5174 + 10 * i))
  preview_port=$((4173 + 10 * i))

  prompt="You review session $s of $batch_file: branch $branch, PR $url, in this worktree only. Read $top/docs/Batch-workflow.md, the current dev copy in the main checkout (the copy in your branch may be older), and follow its Review pass section for this branch. Run the editor with: pnpm --filter @vit-foundation/tileset-editor dev --port $editor_port --strictPort. Serve the demo with: pnpm --filter @vit-foundation/tileset-demo preview --port $preview_port --strictPort, and capture it with shots:capture <dir> http://localhost:$preview_port/. The dev screenshot baseline is $baseline (if it has no .done file, the baseline failed: say the renderer check did not run). The integration result is $summary if it exists; otherwise it will be posted on the PR as a comment later. Commit and push mechanical fixes to $branch. Post your review on the PR with gh pr review $pr --comment --body-file <file in your scratchpad>. Never merge, pull or rebase, and push only to $branch. Only Pol merges into dev."
  case "$prompt$path$top$integ" in *"'"*) die "a path or URL contains a single quote; the prompt cannot be quoted safely" ;; esac

  # acceptEdits so file edits don't prompt. review-settings.json adds the reviewer's commands on top
  # of the branch's own .claude/settings.json, whose deny list (no push to dev, no merge) still
  # applies. It is passed from the main checkout because a branch may predate it.
  # --add-dir lets the reviewer read the baseline and the integration logs. It takes several
  # values, so -- ends the options before the prompt.
  claude_args=(--permission-mode acceptEdits --settings "$top/scripts/review-settings.json"
    --add-dir "$top" --add-dir "$integ" -- "$prompt")

  echo "Session $s: reviewer for PR #$pr, editor port $editor_port, preview port $preview_port"
  if [[ -n "$only" ]]; then
    # Chained or by hand: run in this terminal.
    if (( dry_run )); then
      printf '[dry-run] cd %q && claude' "$path"; printf ' %q' "${claude_args[@]}"; printf '\n'
    else
      cd "$path"
      release_locks
      exec claude "${claude_args[@]}"
    fi
  else
    cmd="cd $(printf '%q' "$path") && claude"
    for a in "${claude_args[@]}"; do cmd+=" $(printf '%q' "$a")"; done
    if (( dry_run )); then
      echo "[dry-run] open a Terminal.app window running: $cmd"
    else
      osascript \
        -e 'on run argv' \
        -e 'tell application "Terminal" to do script (item 1 of argv)' \
        -e 'end run' \
        "$cmd" >/dev/null
    fi
  fi
done

if (( dry_run )); then
  echo "Dry run: nothing was created, posted or opened."
fi
# With --session, only that session decides the exit status; the others were listed for information.
if [[ -n "$only" ]]; then
  (( $(eval "echo \$ok_$only") )) || exit 1
else
  [[ -z "$failures" ]] || exit 1
fi
