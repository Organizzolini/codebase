#!/usr/bin/env bash
# Versions and tags the codebase with semantic-release: the root version, the
# root `CHANGELOG.md`, the `v*` tag and GitHub release the README badge shows,
# and the one `chore(release): 🔖 tag codebase` commit that also carries the
# package versions and changelogs version-packages.sh wrote.
#
# It steps aside, as main-tip.sh describes, both before semantic-release and
# after a failed one. Before matters because semantic-release, finding `main`
# ahead of it, skips the release and exits 0, and tag-packages.sh would then
# commit the package versions on a stale commit. After matters because the
# release commit runs the pre-commit hook for minutes before it pushes, and a
# merge in that window gets the push rejected. Any other failure still fails.
#
# Inputs, all from the environment:
#   GITHUB_TOKEN  a token allowed to push to `main`, create tags and releases
#   GIT_COMMITTER_NAME, GIT_COMMITTER_EMAIL
#                 the identity the release commit is signed as
#   GITHUB_ENV    where `RELEASE_SUPERSEDED=true` is written when `main` moved

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/main-tip.sh"

# Prints, in a collapsed group, what the release commit's pre-commit hook ran.
# semantic-release commits without showing the hook's output, which is most of
# this step's time, and the hook leaves a copy in `last-lint-staged-output.log`.
# A run that made no release commit has no copy, since checkout starts clean.
print_hook_output() {
  if [[ -f last-lint-staged-output.log ]]; then
    echo "::group::🪝 The release commit's pre-commit hook"
    cat last-lint-staged-output.log
    echo "::endgroup::"
  fi
}

base="$(git rev-parse HEAD)"

if main_has_moved_from "${base}"; then
  step_aside_from "${base}"
  exit 0
fi

status=0
pnpm semantic-release || status=$?
print_hook_output
if [[ "${status}" -eq 0 ]]; then
  exit 0
fi

if main_has_moved_from "${base}"; then
  step_aside_from "${base}"
  exit 0
fi

exit 1
