#!/usr/bin/env bash
# Versions the ic-suite packages and writes their changelogs, leaving both
# uncommitted for semantic-release's release commit.
#
# `nx release --skip-publish` reads each package's conventional commits,
# writes the new versions, and prepends the release's entry to each bumped
# package's `CHANGELOG.md`, which ships inside the package. nx.json's
# `release.git` turns off Nx's own commit and tags: semantic-release commits
# these files with the codebase's version, so a release lands on `main` as one
# commit, and tag-packages.sh tags that commit afterwards.
#
# Checkout persists no credentials, so the remote is pointed at the release
# token first. It stays that way for the rest of the job, which is what lets
# semantic-release and tag-packages.sh push afterwards.
#
# Inputs, all from the environment:
#   GITHUB_TOKEN       a token allowed to push to `main` and create tags
#   GITHUB_REPOSITORY  `owner/name`, which the remote URL is built from
#   GITHUB_ENV         where `RELEASE_SUPERSEDED=true` is written when `main`
#                      has already moved

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/main-tip.sh"
source "$(dirname "${BASH_SOURCE[0]}")/release-group.sh"
source "$(dirname "${BASH_SOURCE[0]}")/package-tags.sh"

git remote set-url origin \
  "https://x-access-token:${GITHUB_TOKEN:?}@github.com/${GITHUB_REPOSITORY:?}.git"

# A run `main` has already moved past steps aside before versioning, which
# takes minutes, rather than leaving tag-codebase.sh to find out later.
base="$(git rev-parse HEAD)"
if main_has_moved_from "${base}"; then
  step_aside_from "${base}"
  exit 0
fi

# Nx reads each package's current version from its tags, so a version a
# release committed but never tagged reads as unreleased, and gets bumped
# again along with every package it cascades to. That happened after v2.35.0's
# tag push was cut short. Such versions are tagged and pushed first, on the
# release commit that set them, which finishes that release instead.
tag_release_versions

pnpm exec nx release --skip-publish
