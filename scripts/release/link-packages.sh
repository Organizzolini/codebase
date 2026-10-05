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
npm_tarball_digest() {
  local tarball="${RUNNER_TEMP:?}/npm-tarball.tgz"
  curl --silent --show-error --fail --location --output "${tarball}" \
    "$(npm view "$1" dist.tarball --registry "${NPM_REGISTRY_URL}")"
  echo "sha256:$(sha256sum "${tarball}" | cut -d' ' -f1)"
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
link_npm_packages() {
  local root specifier digest
  local published="${RUNNER_TEMP:?}/newly-published.txt"
  local subjects="${RUNNER_TEMP}/attestation-subjects.txt"
  : >"${subjects}"
  touch "${published}"
  for root in "${roots[@]}"; do
    specifier="$(package_specifier "${root}")"
    is_on_npm "${specifier}" || continue
    digest="$(npm_tarball_digest "${specifier}")"
    if grep -qxF "${specifier}" "${published}"; then
      echo "${digest#sha256:}  ${specifier}" >>"${subjects}"
    fi
    if has_npm_storage_record "${digest}"; then
      echo "🔗 ${specifier} is already linked"
      continue
    fi
    echo "🔗 Linking ${specifier} to ${repository}"
    create_npm_storage_record "${specifier}" "${digest}"
  done
  if [[ -s "${subjects}" ]]; then echo "attest=true" >>"${GITHUB_OUTPUT:?}"; fi
}

mapfile -t roots < <(release_group_roots)
link_npm_packages
