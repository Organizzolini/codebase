#!/usr/bin/env bash
# Shared helpers for tagging ic-suite package versions, sourced by
# version-packages.sh and tag-packages.sh after release-group.sh.
# Source it; it defines functions and runs nothing.

# The most refs GitHub accepts in one push to this repository.
readonly REFS_PER_PUSH=6

# How many times a rejected batch of tags is pushed in all, and how long to
# wait between attempts, in seconds. The delay can be shortened for tests.
readonly TAG_PUSH_ATTEMPTS=4
readonly TAG_PUSH_RETRY_DELAY="${TAG_PUSH_RETRY_DELAY:-20}"

# Prints `<tag> <commit>` for every release-group package whose manifest
# version a release commit set but no `<project>@<version>` tag names yet,
# the pattern nx.json's `release.releaseTag` sets. The commit is the one that
# last changed the manifest's `"version"` line, which is where the tag
# belongs even once `main` has moved past it.
#
# A version set by any other commit is never tagged here. A new package's
# hand-written `0.0.0` is one: tagging it would tell Nx it was released, and
# its first release would never come.
untagged_release_versions() {
  local group project root tag commit subject
  group="$(release_group)" || return 1
  while read -r project root; do
    tag="${project}@$(jq -r .version "${root}/package.json")" || return 1
    if git rev-parse --quiet --verify "refs/tags/${tag}" >/dev/null; then
      continue
    fi
    commit="$(git log -1 --format=%H -G '"version":' -- "${root}/package.json")"
    [[ -n "${commit}" ]] || continue
    subject="$(git log -1 --format=%s "${commit}")"
    if [[ "${subject}" == "chore(release):"* ]]; then
      echo "${tag} ${commit}"
    fi
  done <<<"${group}"
}

# Pushes the given refs, retrying a rejected push. GitHub has rejected a
# batch of new tags with a bare "(failed)" moments after accepting the batch
# before it, as in v2.35.0, so one rejection is not taken as final.
push_with_retries() {
  local attempt
  for ((attempt = 1; attempt <= TAG_PUSH_ATTEMPTS; attempt++)); do
    if git push origin "$@"; then
      return 0
    fi
    if ((attempt < TAG_PUSH_ATTEMPTS)); then
      echo "🔁 Push rejected; trying again in ${TAG_PUSH_RETRY_DELAY}s (${attempt} of ${TAG_PUSH_ATTEMPTS})"
      sleep "${TAG_PUSH_RETRY_DELAY}"
    fi
  done
  return 1
}

# Creates an annotated tag at its commit for every untagged release version,
# and pushes the new tags `REFS_PER_PUSH` at a time: GitHub rejects any push
# to this repository that updates more than 6 refs, and a release can tag all
# 28 packages.
tag_release_versions() {
  local versions tag commit start
  local tags=() refs=()
  versions="$(untagged_release_versions)" || return 1
  while read -r tag commit; do
    [[ -n "${tag}" ]] || continue
    git tag --annotate "${tag}" --message "${tag}" "${commit}" || return 1
    tags+=("${tag}")
  done <<<"${versions}"
  echo "🏷️ Pushing ${#tags[@]} package tags, ${REFS_PER_PUSH} at a time"
  for ((start = 0; start < ${#tags[@]}; start += REFS_PER_PUSH)); do
    refs=()
    for tag in "${tags[@]:start:REFS_PER_PUSH}"; do
      refs+=("refs/tags/${tag}")
    done
    push_with_retries "${refs[@]}" || return 1
  done
}
