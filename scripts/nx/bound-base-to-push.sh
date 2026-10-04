#!/usr/bin/env bash
# Moves a push's `NX_BASE` to the push's own previous tip, `BEFORE`.
#
# On a push, `nx-set-shas` bases the run on the last commit whose whole
# workflow succeeded. One red run on main — a flaky test, a timeout — then
# widens the next run to every merge since, which runs longer, times out in
# turn, and widens the one after: 19 of 40 main runs covered the whole
# workspace. Continuous Integration does not need that retry, because each
# commit reaching main already passed the merge queue against main's tip, so it
# asks for the push's own previous tip. Continuous Deployment needs no retry
# either: its release job builds every project, affected or not.
#
# `NX_BASE` is kept when there is no previous tip (an empty or all-zero
# `BEFORE`, as on a new branch) or when `BEFORE` is not an ancestor of
# `NX_HEAD` (a force-push, or a commit this clone does not have).
#
# Inputs, all from the environment:
#   BEFORE            the push's previous tip, `github.event.before`
#   NX_BASE, NX_HEAD  the revisions `nrwl/nx-set-shas` exported
#   GITHUB_ENV        the file a changed `NX_BASE` is written to

set -euo pipefail

if [[ -z "${NX_BASE:-}" || -z "${NX_HEAD:-}" ]]; then
  echo "❌ NX_BASE and NX_HEAD are unset; run nx-set-shas first"
  exit 1
fi

before="${BEFORE:-}"

if [[ -z "${before}" || "${before}" =~ ^0+$ ]]; then
  echo "🎯 No previous tip for this push; keeping NX_BASE=${NX_BASE}"
elif ! git merge-base --is-ancestor "${before}" "${NX_HEAD}" 2>/dev/null; then
  echo "🎯 ${before} is not an ancestor of ${NX_HEAD}; keeping NX_BASE=${NX_BASE}"
else
  echo "🎯 Bounding NX_BASE to the push: ${NX_BASE} → ${before}"
  echo "NX_BASE=${before}" >>"${GITHUB_ENV:?}"
fi
