#!/usr/bin/env bash
# Publishes each released ic-suite package to npm, then as a GitHub release.
#
# npm gets every package in the Nx release group, read from nx.json, whose
# version is not on npm yet, so a re-run sends only what is missing. pnpm
# rather than `nx release publish`, because pnpm honors provenance only as the
# `--provenance` flag, which Nx cannot pass: `NPM_CONFIG_PROVENANCE` and
# `publishConfig.provenance` are ignored. `setup-node` writes no registry
# `.npmrc`, so the token goes in the user config.
#
# Then every `<project>@<version>` tag with no GitHub release yet gets one,
# so a run that stopped after the push is completed by the next. Each release
# links to the npm version and lists the package's commits since its previous
# tag. `--latest=false` keeps the codebase's `v*` release as Latest, which is
# the one the README badge shows.
#
# Inputs, all from the environment:
#   NPM_TOKEN    an npm token allowed to publish every package's scope
#   GH_TOKEN     a token allowed to create releases in this repository
#   RUNNER_TEMP  a scratch directory for each release's notes

set -euo pipefail

# Prints a `--filter` for the directory of every project in the release group.
release_group_filters() {
  local release_projects project
  release_projects="$(jq -r '.release.projects | join(",")' nx.json)"
  for project in $(pnpm exec nx show projects --projects "${release_projects}" --json | jq -r '.[]'); do
    printf '%s\n' --filter "./$(pnpm exec nx show project "${project}" --json | jq -r .root)"
  done
}

# Publishes every release-group package whose version is not on npm yet.
publish_to_npm() {
  local filters
  echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN:?}" >>~/.npmrc
  mapfile -t filters < <(release_group_filters)
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

publish_to_npm
release_on_github
