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
# A package is newly versioned when its `<project>@<version>` tag, the pattern
# nx.json's `release.releaseTag` sets, does not exist yet. Checkout fetches
# every tag, so only this release's are missing, and a re-run creates nothing
# twice.
#
# GitHub rejects any push to this repository that updates more than 6 refs,
# and a first release tags 20 or more packages, so the tags go 6 at a time. A
# batch that fails leaves `main` already carrying the versions, and the
# missing tags can be pushed from that commit without versioning again.
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

# The most refs GitHub accepts in one push to this repository.
readonly REFS_PER_PUSH=6

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
  git commit --message "chore(release): 🔖 version packages"
  if ! git push origin HEAD:refs/heads/main; then
    if main_has_moved_from "${base}"; then
      step_aside_from "${base}"
      exit 0
    fi
    exit 1
  fi
}

# Tags HEAD for every release-group package whose version has no tag yet,
# adding each tag it makes to `tags`.
tag_new_versions() {
  local project root tag
  for project in $(release_group_projects); do
    root="$(project_root "${project}")"
    tag="${project}@$(jq -r .version "${root}/package.json")"
    if git rev-parse --quiet --verify "refs/tags/${tag}" >/dev/null; then
      continue
    fi
    git tag --annotate "${tag}" --message "${tag}"
    tags+=("${tag}")
  done
}

commit_leftover_versions

tags=()
tag_new_versions
echo "🏷️ Pushing ${#tags[@]} package tags, ${REFS_PER_PUSH} at a time"

for ((start = 0; start < ${#tags[@]}; start += REFS_PER_PUSH)); do
  refs=()
  for tag in "${tags[@]:start:REFS_PER_PUSH}"; do
    refs+=("refs/tags/${tag}")
  done
  git push origin "${refs[@]}"
done
