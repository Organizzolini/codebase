#!/usr/bin/env bash
# Publishes each released ic-suite package to npm, as a GitHub release, and to
# GitHub Packages.
#
# npm gets every package in the Nx release group, read from nx.json, whose
# version is not on npm yet, so a re-run sends only what is missing. pnpm
# rather than `nx release publish`, because pnpm honors provenance only as the
# `--provenance` flag, which Nx cannot pass: `NPM_CONFIG_PROVENANCE` and
# `publishConfig.provenance` are ignored. `setup-node` writes no registry
# `.npmrc`, so the tokens go in the user config.
#
# Then every `<project>@<version>` tag with no GitHub release yet gets one,
# so a run that stopped after the push is completed by the next. Each release
# links to the npm version and lists the package's commits since its previous
# tag. `--latest=false` keeps the codebase's `v*` release as Latest, which is
# the one the README badge shows.
#
# Last, each package is mirrored to GitHub Packages, which is what lists it in
# the repository's Packages sidebar. That registry accepts only packages
# scoped to the repository's owner, so `@codometer/cli` is mirrored as
# `@organizzolini/codometer-cli`, packed by pnpm exactly as npm got it and then
# renamed. Its `publishConfig` is dropped, because a `publishConfig.registry`
# overrides `--registry` and would send it to npm instead. It goes last because
# it is a copy: npm stays where the packages are installed from.
#
# Inputs, all from the environment:
#   NPM_TOKEN                 an npm token allowed to publish every package's scope
#   GH_TOKEN                  a token allowed to create releases in this repository
#   GITHUB_PACKAGES_TOKEN     a token with `packages: write` for this repository
#   GITHUB_REPOSITORY_OWNER   the owner, whose lowercased name is the mirrors' scope
#   RUNNER_TEMP               a scratch directory for release notes and mirrors
#   GITHUB_PACKAGES_REGISTRY  optional, the mirror registry, to test against
#                             a local one instead of https://npm.pkg.github.com

set -euo pipefail

readonly GITHUB_PACKAGES_REGISTRY="${GITHUB_PACKAGES_REGISTRY:-https://npm.pkg.github.com}"

# Prints the directory of every project in the release group, one per line.
release_group_roots() {
  local release_projects project
  release_projects="$(jq -r '.release.projects | join(",")' nx.json)"
  for project in $(pnpm exec nx show projects --projects "${release_projects}" --json | jq -r '.[]'); do
    pnpm exec nx show project "${project}" --json | jq -r .root
  done
}

# Publishes every release-group package whose version is not on npm yet.
publish_to_npm() {
  local root filters=()
  echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN:?}" >>~/.npmrc
  for root in "${roots[@]}"; do
    filters+=(--filter "./${root}")
  done
  echo "📦 Publishing the release group to npm"
  pnpm -r "${filters[@]}" publish --provenance --no-git-checks \
    --tag latest --registry https://registry.npmjs.org
}

# Writes one package tag's release notes to the given file.
write_release_notes() {
  local tag="$1" name="$2" root="$3" notes="$4"
  local project="${tag%@*}" version="${tag##*@}" previous
  previous="$(git tag --list "${project}@*" --sort=-v:refname --merged "${tag}^" | head -1)"
  {
    echo "Published to npm as [\`${name}@${version}\`](https://www.npmjs.com/package/${name}/v/${version})."
    if [[ -n "${previous}" ]]; then
      echo
      echo "Changes since \`${previous}\`:"
      echo
      git log --no-merges --invert-grep --grep='^chore(release):' \
        --format='- %s (%h)' "${previous}..${tag}" -- "${root}"
    fi
  } >"${notes}"
}

# Creates a GitHub release for every package tag that has none yet.
release_on_github() {
  local released tag project version root name
  local notes="${RUNNER_TEMP:?}/release-notes.md"
  released="$(gh release list --limit 1000 --json tagName --jq '.[].tagName')"
  for tag in $(git tag --list '*@*'); do
    if grep -qxF "${tag}" <<<"${released}"; then continue; fi
    project="${tag%@*}"
    version="${tag##*@}"
    root="$(pnpm exec nx show project "${project}" --json | jq -r .root)"
    name="$(jq -r .name "${root}/package.json")"
    write_release_notes "${tag}" "${name}" "${root}" "${notes}"
    echo "🗒️ Releasing ${name} ${version} on GitHub"
    gh release create "${tag}" --verify-tag --latest=false \
      --title "${name} ${version}" --notes-file "${notes}"
  done
}

# Publishes every release-group package to GitHub Packages, under the
# owner's scope, unless that version is there already.
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
release_on_github
mirror_to_github_packages
