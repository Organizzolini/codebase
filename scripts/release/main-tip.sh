#!/usr/bin/env bash
# Shared helpers for the release scripts that push to `main`.
# Source it; it defines functions and runs nothing.
#
# A release run takes long enough that another pull request often merges
# while it works. That newer commit gets a release run of its own, which
# releases everything this one would have, so a run that finds `main` has
# moved steps aside instead of failing on a rejected push.

# Reports whether the remote's `main` is no longer the given commit.
main_has_moved_from() {
  git fetch --quiet origin main
  [[ "$(git rev-parse FETCH_HEAD)" != "$1" ]]
}

# Sets `RELEASE_SUPERSEDED=true` for every later step of the job, which each
# release step after this one skips on, and says why.
step_aside_from() {
  echo "RELEASE_SUPERSEDED=true" >>"${GITHUB_ENV:?}"
  echo "⏭️ main moved from $(git rev-parse --short "$1") to $(git rev-parse --short FETCH_HEAD) during this run, whose release the newer run makes instead"
}
