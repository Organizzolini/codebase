#!/usr/bin/env bash

set -euo pipefail

# Deletes local branches whose last commit is older than 32 days.
# Excludes the current branch, main, and develop.

readonly DEFAULT_DAYS_WITHOUT_UPDATES=32

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "❌ This script must run inside a git repository." >&2
  exit 1
fi

current_branch_name="$(git branch --show-current)"
if [[ -z "${current_branch_name}" ]]; then
  echo "❌ Detached HEAD detected. Checkout a branch before deleting others." >&2
  exit 1
fi

if ! command -v gh > /dev/null 2>&1; then
  echo "❌ GitHub CLI (gh) is required to skip branches with open pull requests." >&2
  exit 1
fi

if ! gh auth status > /dev/null 2>&1; then
  echo "❌ GitHub CLI is not authenticated. Run 'gh auth login' and retry." >&2
  exit 1
fi

if ! open_pull_request_branch_names="$(gh pr list --state open --limit 1000 --json headRefName --jq '.[].headRefName')"; then
  echo "❌ Unable to query open pull requests with GitHub CLI." >&2
  exit 1
fi

if date -v-1d +%s > /dev/null 2>&1; then
  cutoff_unix_timestamp="$(date -v-"${DEFAULT_DAYS_WITHOUT_UPDATES}"d +%s)"
else
  cutoff_unix_timestamp="$(date -d "-${DEFAULT_DAYS_WITHOUT_UPDATES} days" +%s)"
fi

stale_branch_names=()

while read -r branch_name; do
  if [[ -z "${branch_name}" ]]; then
    continue
  fi

  branch_commit_unix_timestamp="$(git log -1 --format='%ct' "${branch_name}")"
  branch_commit_date="$(git log -1 --format='%cs' "${branch_name}")"

  if [[ "${branch_name}" == "${current_branch_name}" ]]; then
    continue
  fi

  if [[ "${branch_name}" == "main" || "${branch_name}" == "develop" ]]; then
    continue
  fi

  if [[ -n "${open_pull_request_branch_names}" ]] && printf '%s\n' "${open_pull_request_branch_names}" | grep -Fxq "${branch_name}"; then
    continue
  fi

  if [[ "${branch_commit_unix_timestamp}" -lt "${cutoff_unix_timestamp}" ]]; then
    stale_branch_names+=("${branch_name}|${branch_commit_date}")
  fi
done < <(git for-each-ref refs/heads --format='%(refname:short)')

if [[ "${#stale_branch_names[@]}" -eq 0 ]]; then
  echo "✅ No stale local branches found older than ${DEFAULT_DAYS_WITHOUT_UPDATES} days."
  exit 0
fi

echo "Found ${#stale_branch_names[@]} stale local branch(es) older than ${DEFAULT_DAYS_WITHOUT_UPDATES} days:"
for stale_branch_record in "${stale_branch_names[@]}"; do
  stale_branch_name="${stale_branch_record%%|*}"
  stale_branch_date="${stale_branch_record#*|}"
  echo "  - ${stale_branch_name} (last commit: ${stale_branch_date})"
done

echo "🧹 Deleting stale local branches..."
for stale_branch_record in "${stale_branch_names[@]}"; do
  stale_branch_name="${stale_branch_record%%|*}"
  git branch -D "${stale_branch_name}"
done

echo "✅ Deleted ${#stale_branch_names[@]} stale local branch(es)."
