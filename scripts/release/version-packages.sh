#!/usr/bin/env bash
# Versions the ic-suite packages, writes their changelogs, commits and tags
# them, and pushes both.
#
# `nx release --skip-publish` reads each package's conventional commits,
# writes the new versions, and prepends the release's entry to each bumped
# package's `CHANGELOG.md`, which ships inside the package. It then makes one
# `chore(release): 🔖 publish` commit tagged `<project>@<version>` per bumped
# package, as nx.json's `release.git` sets out. Publishing is left to the next
# step. Nx's own push would add `--no-verify` and skip the pre-push hook, so
# `release.git.push` is off and the push is made here instead.
#
# GitHub rejects any push to this repository that updates more than 6 refs,
# and a first release tags 20 or more packages, so the release commit goes
# first, on its own, and its tags follow 6 at a time. A batch that fails
# leaves `main` already carrying the versions, and the missing tags can be
# pushed from that commit without versioning again.
#
# Checkout persists no credentials, so the remote is pointed at the release
# token first. It stays that way for the rest of the job, which is what lets
# semantic-release push afterwards.
#
# Inputs, all from the environment:
#   GITHUB_TOKEN       a token allowed to push to `main` and create tags
#   GITHUB_REPOSITORY  `owner/name`, which the remote URL is built from
#   GIT_COMMITTER_NAME, GIT_COMMITTER_EMAIL
#                      the identity the release commit is signed as

set -euo pipefail

# The most refs GitHub accepts in one push to this repository.
readonly REFS_PER_PUSH=6

git remote set-url origin \
  "https://x-access-token:${GITHUB_TOKEN:?}@github.com/${GITHUB_REPOSITORY:?}.git"

pnpm exec nx release --skip-publish

echo "🏷️ Pushing the release commit to main"
git push origin HEAD:refs/heads/main

mapfile -t tags < <(git tag --points-at HEAD --list '*@*')
echo "🏷️ Pushing ${#tags[@]} package tags, ${REFS_PER_PUSH} at a time"

for ((start = 0; start < ${#tags[@]}; start += REFS_PER_PUSH)); do
  refs=()
  for tag in "${tags[@]:start:REFS_PER_PUSH}"; do
    refs+=("refs/tags/${tag}")
  done
  git push origin "${refs[@]}"
done
