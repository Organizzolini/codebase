#!/usr/bin/env bash

set -e

zero_sha='0000000000000000000000000000000000000000'
unsigned_commits=()

while read -r local_ref local_sha remote_ref remote_sha; do
  if [[ -z "${local_ref}" || "${local_sha}" == "${zero_sha}" ]]; then
    continue
  fi

  if [[ "${local_ref}" == refs/notes/semantic-release-* || "${remote_ref}" == refs/notes/semantic-release-* ]]; then
    continue
  fi

  commit_range=''
  if [[ "${remote_sha}" == "${zero_sha}" ]]; then
    commit_range="$(git rev-list "${local_sha}" --not --remotes)"
  else
    commit_range="$(git rev-list "${remote_sha}..${local_sha}" --not --remotes)"
  fi

  if [[ -z "${commit_range}" ]]; then
    continue
  fi

  while read -r commit_sha; do
    if [[ -z "${commit_sha}" ]]; then
      continue
    fi

    signature_status="$(git log -1 --format='%G?' "${commit_sha}")"
    if [[ "${signature_status}" != 'G' && "${signature_status}" != 'U' ]]; then
      commit_subject="$(git log -1 --format='%s' "${commit_sha}")"
      unsigned_commits+=("${commit_sha} [${signature_status}] ${commit_subject}")
    fi
  done <<< "${commit_range}"
done

if [[ "${#unsigned_commits[@]}" -gt 0 ]]; then
  echo "❌ Push rejected because unsigned or unverifiable commits were found:" >&2
  printf '  - %s\n' "${unsigned_commits[@]}" >&2
  echo "    Recreate or amend commits with signing enabled (git commit -S ...)." >&2
  exit 1
fi
