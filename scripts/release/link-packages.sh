#!/usr/bin/env bash
# Links each published ic-suite package on npm to this repository, on the
# organization's Linked artifacts page.
#
# Inputs, all from the environment:
#   GH_TOKEN                 a token with `artifact-metadata: write`
#   GITHUB_REPOSITORY_OWNER  the organization the records belong to
#   GITHUB_REPOSITORY        `owner/name`, whose name each record credits
#   GITHUB_OUTPUT            where `attest=true` is written when a package
#                            published in this run is ready to be attested
#   RUNNER_TEMP              a scratch directory for the downloaded tarballs,
#                            holding publish-packages.sh's `newly-published.txt`

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/release-group.sh"

readonly NPM_REGISTRY_URL=https://registry.npmjs.org/

# The repository each record credits, by name: the organization is the path's.
repository="${GITHUB_REPOSITORY:?}"
readonly REPOSITORY_NAME="${repository#*/}"

# Prints the `sha256:…` digest of the tarball npm serves for a
# `<name>@<version>`, which is what both a storage record and an attestation
# identify the package by. npm itself reports only a sha512 integrity.
#
# The tarball's address is built rather than looked up, and fetched with
# retries for up to 8 minutes, because npm can trail a publish by minutes. In
# v2.34.0 npm served each new tarball about 4 minutes after pnpm reported it
# published, and answered 404 until then.
npm_tarball_digest() {
  local specifier="$1"
  local name="${specifier%@*}" version="${specifier##*@}"
  local tarball
  tarball="$(mktemp "${RUNNER_TEMP:?}/npm-tarball.XXXXXX")" || return 1
  if ! curl --silent --show-error --fail --location --output "${tarball}" \
    --retry 48 --retry-all-errors --retry-delay 10 --retry-max-time 480 \
    "${NPM_REGISTRY_URL}${name}/-/${name##*/}-${version}.tgz"; then
    rm -f "${tarball}"
    return 1
  fi
  echo "sha256:$(sha256sum "${tarball}" | cut -d' ' -f1)"
  rm -f "${tarball}"
}

# Reports whether the organization already has an npm storage record for a
# digest. The API answers 404 while a digest has no records at all.
has_npm_storage_record() {
  local records
  records="$(gh api "orgs/${GITHUB_REPOSITORY_OWNER:?}/artifacts/$1/metadata/storage-records" 2>/dev/null || true)"
  [[ -n "${records}" ]] || return 1
  jq -e --arg registry "${NPM_REGISTRY_URL}" \
    '[.storage_records[]? | select(.registry_url == $registry)] | length > 0' \
    <<<"${records}" >/dev/null
}

# Creates the storage record that lists a package on the Linked artifacts
# page: where npm keeps it, and which repository it was built from.
create_npm_storage_record() {
  local specifier="$1" digest="$2"
  local name="${specifier%@*}" version="${specifier##*@}"
  jq -n --arg name "${name}" --arg version "${version}" --arg digest "${digest}" \
    --arg registry "${NPM_REGISTRY_URL}" --arg repository "${REPOSITORY_NAME}" '{
      name: $name, version: $version, digest: $digest,
      registry_url: $registry,
      artifact_url: "https://www.npmjs.com/package/\($name)/v/\($version)",
      github_repository: $repository, status: "active"
    }' |
    gh api --method POST "orgs/${GITHUB_REPOSITORY_OWNER:?}/artifacts/metadata/storage-record" \
      --input - >/dev/null
}

# Records every published release-group version that has no record yet, and
# lists the ones this run published in a checksums file for `actions/attest`.
# Attesting only those keeps the provenance honest: an attestation says this
# run built the package, which is untrue of a version an earlier run published.
# A version this run published is known to be on npm without asking, which
# matters while npm's metadata has yet to list it. One package failing to link
# still lets the others be attested, before the step fails.
link_npm_packages() {
  local published="${RUNNER_TEMP:?}/newly-published.txt"
  local subjects="${RUNNER_TEMP}/attestation-subjects.txt"
  : >"${subjects}"
  touch "${published}"
  local status=0
  run_in_parallel link_npm_package "${roots[@]}" || status=$?
  if [[ -s "${subjects}" ]]; then echo "attest=true" >>"${GITHUB_OUTPUT:?}"; fi
  return "${status}"
}

# Links the package in the given directory, as link_npm_packages describes,
# using its `published` and `subjects`. Each line it adds to `subjects` is one
# short append, so several packages can link at once.
#
# Every failure returns explicitly rather than relying on `set -e`, which bash
# ignores here: link_npm_packages runs this inside `||`, and that disables it
# for everything the list runs, background calls included. v2.34.0 posted
# empty digests that way when its tarball downloads failed.
link_npm_package() {
  local root="$1"
  local specifier digest
  specifier="$(package_specifier "${root}")" || return 1
  if grep -qxF "${specifier}" "${published}"; then
    digest="$(npm_tarball_digest "${specifier}")" || return 1
    echo "${digest#sha256:}  ${specifier}" >>"${subjects}"
  elif is_on_npm "${specifier}"; then
    digest="$(npm_tarball_digest "${specifier}")" || return 1
  else
    return 0
  fi
  if has_npm_storage_record "${digest}"; then
    echo "🔗 ${specifier} is already linked"
    return 0
  fi
  echo "🔗 Linking ${specifier} to ${repository}"
  create_npm_storage_record "${specifier}" "${digest}" || return 1
}

group_roots="$(release_group_roots)"
mapfile -t roots <<<"${group_roots}"
link_npm_packages
