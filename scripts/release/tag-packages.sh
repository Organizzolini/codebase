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
# The remote must already carry a token allowed to push, as
# version-packages.sh leaves it.

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/release-group.sh"

# The most refs GitHub accepts in one push to this repository.
readonly REFS_PER_PUSH=6

# Everything version-packages.sh may write.
readonly VERSIONED_FILES=(
  ':(glob)packages/ic-suite/*/*/CHANGELOG.md'
  ':(glob)packages/ic-suite/*/*/package.json'
  pnpm-lock.yaml
)

# Commits and pushes any versions semantic-release left uncommitted.
commit_leftover_versions() {
  git add -- "${VERSIONED_FILES[@]}"
  if git diff --cached --quiet; then
    return
  fi
  echo "🏷️ No codebase release committed the package versions; committing them"
  git commit --message "chore(release): 🔖 version packages"
  git push origin HEAD:refs/heads/main
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
