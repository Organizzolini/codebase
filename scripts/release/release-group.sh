#!/usr/bin/env bash
# Shared helpers for the release scripts beside this file.
# Source it; it defines functions and runs nothing.

# How many registry calls run_in_parallel makes at once.
readonly PARALLEL_CALLS=6

# Prints `<project> <root>` for every project in the Nx release group, read
# from nx.json's `release.projects`, one per line.
#
# Two Nx calls in all, rather than one per project: each starts Nx afresh,
# and asking for every project's root separately took about 90 seconds a
# step for 28 packages.
#
# Callers read it into a variable rather than through `< <(…)`, whose failure
# nothing notices. It fails rather than print nothing, since an empty group
# would leave `pnpm -r publish` with no filter, publishing every package.
release_group() {
  local release_projects graph projects group
  release_projects="$(jq -r '.release.projects | join(",")' nx.json)"
  graph="$(mktemp -d)/graph.json"
  if ! pnpm exec nx graph --file="${graph}" >/dev/null ||
    ! projects="$(pnpm exec nx show projects --projects "${release_projects}" --json)" ||
    ! group="$(jq -r --arg projects "${projects}" \
      '.graph.nodes as $nodes | $projects | fromjson | .[] |
        "\(.) \($nodes[.].data.root // error("no root for \(.)"))"' "${graph}")"; then
    group=""
  fi
  rm -rf "$(dirname "${graph}")"
  if [[ -z "${group}" ]]; then
    echo "❌ Could not read the Nx release group" >&2
    return 1
  fi
  echo "${group}"
}

# Prints the directory of every project in the Nx release group, one per line.
#
# Its failure is passed on explicitly: callers run it in `$(…)`, where
# `set -e` does not stop it.
release_group_roots() {
  local group
  group="$(release_group)" || return 1
  cut -d' ' -f2 <<<"${group}"
}

# Prints `<name>@<version>` for the package in the given directory.
package_specifier() {
  jq -r '"\(.name)@\(.version)"' "$1/package.json"
}

# Reports whether npm already has the given `<name>@<version>`.
is_on_npm() {
  npm view "$1" version --registry https://registry.npmjs.org >/dev/null 2>&1
}

# Calls the named function once for each remaining argument, PARALLEL_CALLS
# at a time, and fails when any call failed. Each call's output is held back
# and printed whole, in argument order, so concurrent calls never interleave.
run_in_parallel() {
  local function="$1"
  shift
  local logs argument pid index=0 next=0 failed=0
  local running=()
  logs="$(mktemp -d)"
  for argument in "$@"; do
    if ((${#running[@]} >= PARALLEL_CALLS)); then
      wait "${running[0]}" || failed=1
      cat "${logs}/${next}"
      running=("${running[@]:1}")
      next=$((next + 1))
    fi
    "${function}" "${argument}" >"${logs}/${index}" 2>&1 &
    running+=("$!")
    index=$((index + 1))
  done
  for pid in "${running[@]}"; do
    wait "${pid}" || failed=1
    cat "${logs}/${next}"
    next=$((next + 1))
  done
  rm -rf "${logs}"
  return "${failed}"
}
