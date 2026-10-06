#!/usr/bin/env bash
# Shared helpers for the release scripts beside this file.
# Source it; it defines functions and runs nothing.

# Prints the name of every project in the Nx release group, read from
# nx.json's `release.projects`, one per line.
release_group_projects() {
  local release_projects
  release_projects="$(jq -r '.release.projects | join(",")' nx.json)"
  pnpm exec nx show projects --projects "${release_projects}" --json | jq -r '.[]'
}

# Prints the directory of the given Nx project.
project_root() {
  pnpm exec nx show project "$1" --json | jq -r .root
}

# Prints the directory of every project in the Nx release group, one per line.
release_group_roots() {
  local project
  for project in $(release_group_projects); do
    project_root "${project}"
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
