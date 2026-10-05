#!/usr/bin/env bash
# Shared helpers for the release scripts beside this file.
# Source it; it defines functions and runs nothing.

# Prints the directory of every project in the Nx release group, read from
# nx.json's `release.projects`, one per line.
release_group_roots() {
  local release_projects project
  release_projects="$(jq -r '.release.projects | join(",")' nx.json)"
  for project in $(pnpm exec nx show projects --projects "${release_projects}" --json | jq -r '.[]'); do
    pnpm exec nx show project "${project}" --json | jq -r .root
  done
}

# Prints `<name>@<version>` for the package in the given directory.
package_specifier() {
  jq -r '"\(.name)@\(.version)"' "$1/package.json"
}

# Reports whether npm already has the given `<name>@<version>`.
is_on_npm() {
  npm view "$1" version --registry https://registry.npmjs.org >/dev/null 2>&1
}
