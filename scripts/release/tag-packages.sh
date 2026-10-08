#!/usr/bin/env bash
# Tags each newly versioned ic-suite package on the release commit, and pushes
# the tags.
#
# semantic-release's release commit carries the versions and changelogs that
# version-packages.sh wrote. It makes that commit only when the codebase itself
# releases, which a package-scoped `no-release` commit can prevent while Nx
# still bumps the package, so anything left uncommitted is committed here
# instead, on its own.
#
# A package is newly versioned when a release commit set its manifest version
# and no `<project>@<version>` tag names it yet; package-tags.sh tags each such
# version on the commit that set it. Checkout fetches every tag, so only this
# release's are missing, and a re-run creates nothing twice. A run that dies
# with tags still missing leaves them for the next run's version-packages.sh,
# which pushes them before Nx reads the tags.
#
# Inputs, all from the environment:
#   GIT_COMMITTER_NAME, GIT_COMMITTER_EMAIL
#                      the identity a leftover release commit is signed as
#   GITHUB_ENV         where `RELEASE_SUPERSEDED=true` is written when `main`
#                      moved before the leftover commit could be pushed
# The remote must already carry a token allowed to push, as
# version-packages.sh leaves it.

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/release-group.sh"
source "$(dirname "${BASH_SOURCE[0]}")/main-tip.sh"
source "$(dirname "${BASH_SOURCE[0]}")/package-tags.sh"

# Prints every file version-packages.sh may have written that exists. Globs
# rather than git path patterns, which fail the whole `git add` when one
# matches nothing, as the changelog one does until a package's first
# changelog entry.
versioned_files() {
  local file
  for file in packages/ic-suite/*/*/CHANGELOG.md packages/ic-suite/*/*/package.json pnpm-lock.yaml; do
    if [[ -e "${file}" ]]; then printf '%s\n' "${file}"; fi
  done
}

# Commits and pushes any versions semantic-release left uncommitted. A push
# rejected because `main` moved steps aside, as main-tip.sh describes, and
# exits the script before anything is tagged.
commit_leftover_versions() {
  local base files
  mapfile -t files < <(versioned_files)
  git add -- "${files[@]}"
  if git diff --cached --quiet; then
    return
  fi
  echo "🏷️ No codebase release committed the package versions; committing them"
  base="$(git rev-parse HEAD)"
  git commit --message "chore(release): 🔖 tag packages"
  if ! git push origin HEAD:refs/heads/main; then
    if main_has_moved_from "${base}"; then
      step_aside_from "${base}"
      exit 0
    fi
    exit 1
  fi
}

commit_leftover_versions
tag_release_versions
