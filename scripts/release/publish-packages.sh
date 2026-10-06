#!/usr/bin/env bash
# Publishes each released ic-suite package to npm and to GitHub Packages.
#
# Each package's changes are in the `CHANGELOG.md` it ships, which the version
# step wrote, rather than in a GitHub release of its own: the repository's
# releases are the codebase's `v*` ones alone.
#
# Inputs, all from the environment:
#   NPM_TOKEN                 an npm token allowed to publish every package's scope
#   GITHUB_PACKAGES_TOKEN     a token with `packages: write` for this repository
#   GITHUB_REPOSITORY_OWNER   the owner, whose lowercased name is the mirrors' scope
#   RUNNER_TEMP               a scratch directory for the mirrors, and where
#                             `newly-published.txt` lists each `<name>@<version>`
#                             this run put on npm, for link-packages.sh
#   GITHUB_PACKAGES_REGISTRY  optional, the mirror registry, to test against
#                             a local one instead of https://npm.pkg.github.com

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/release-group.sh"

readonly GITHUB_PACKAGES_REGISTRY="${GITHUB_PACKAGES_REGISTRY:-https://npm.pkg.github.com}"

# Publishes every release-group package whose version is not on npm yet.
#
# npm gets every package in the Nx release group, read from nx.json, whose
# version is not on npm yet, so a re-run sends only what is missing. pnpm
# rather than `nx release publish`, because pnpm honors provenance only as the
# `--provenance` flag, which Nx cannot pass: `NPM_CONFIG_PROVENANCE` and
# `publishConfig.provenance` are ignored. `setup-node` writes no registry
# `.npmrc`, so the tokens go in the user config.
#
# What this run published, which is all the next step may attest as built
# here, comes from pnpm's own summary of it. Asking npm afterwards, as this
# once did, missed 21 of 23 new versions in one run: a version npm has just
# accepted can still read as missing for minutes after. A publish that fails
# part way still records whatever pnpm reports, before the step fails.
publish_to_npm() {
  local root filters=()
  local published="${RUNNER_TEMP:?}/newly-published.txt"
  echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN:?}" >>~/.npmrc
  for root in "${roots[@]}"; do
    filters+=(--filter "./${root}")
  done
  echo "📦 Publishing the release group to npm"
  rm -f pnpm-publish-summary.json
  : >"${published}"
  local status=0
  pnpm -r "${filters[@]}" publish --provenance --no-git-checks \
    --tag latest --registry https://registry.npmjs.org --report-summary || status=$?
  if [[ -f pnpm-publish-summary.json ]]; then
    jq -r '.publishedPackages[] | "\(.name)@\(.version)"' \
      pnpm-publish-summary.json >"${published}"
    rm pnpm-publish-summary.json
  fi
  return "${status}"
}

# Publishes every release-group package to GitHub Packages, under the
# owner's scope, unless that version is there already.
#
# GitHub Packages is what lists each package in the repository's Packages
# sidebar. That registry accepts only packages scoped to the repository's
# owner, so `@codometer/cli` is mirrored as
# `@organizzolini/codometer-cli`, packed by pnpm exactly as npm got it and then
# renamed. Its `publishConfig` is dropped, because a `publishConfig.registry`
# overrides `--registry` and would send it to npm instead. It goes last because
# it is a copy: npm stays where the packages are installed from.
mirror_to_github_packages() {
  local root name version mirror tarball unpacked
  local scope="${GITHUB_REPOSITORY_OWNER:?}"
  local mirrors="${RUNNER_TEMP:?}/github-packages"
  echo "//${GITHUB_PACKAGES_REGISTRY#*://}/:_authToken=${GITHUB_PACKAGES_TOKEN:?}" >>~/.npmrc
  rm -rf "${mirrors}"
  mkdir -p "${mirrors}"
  for root in "${roots[@]}"; do
    name="$(jq -r .name "${root}/package.json")"
    version="$(jq -r .version "${root}/package.json")"
    mirror="@${scope,,}/$(basename "${root}")"
    if npm view "${mirror}@${version}" version --registry "${GITHUB_PACKAGES_REGISTRY}" >/dev/null 2>&1; then
      echo "🐙 ${mirror}@${version} is already on GitHub Packages"
      continue
    fi
    tarball="${mirrors}/$(basename "${root}").tgz"
    (cd "${root}" && pnpm pack --out "${tarball}" >/dev/null)
    unpacked="${mirrors}/$(basename "${root}")"
    mkdir -p "${unpacked}"
    tar -xzf "${tarball}" -C "${unpacked}" --strip-components 1
    jq --arg mirror "${mirror}" '.name = $mirror | del(.publishConfig)' \
      "${unpacked}/package.json" >"${unpacked}/package.json.mirrored"
    mv "${unpacked}/package.json.mirrored" "${unpacked}/package.json"
    echo "🐙 Mirroring ${name}@${version} to GitHub Packages as ${mirror}"
    npm publish "${unpacked}" --ignore-scripts --registry "${GITHUB_PACKAGES_REGISTRY}"
  done
}

mapfile -t roots < <(release_group_roots)
publish_to_npm
mirror_to_github_packages
