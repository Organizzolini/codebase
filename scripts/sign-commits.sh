#!/usr/bin/env bash

set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "${script_directory}/.." && pwd)"

cd "${repository_root}"

current_branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
if [[ -z "${current_branch}" ]]; then
  echo '❌ A branch must be checked out before re-signing commits.' >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo '❌ Working tree is not clean. Commit, stash, or discard changes first.' >&2
  exit 1
fi

echo '🌳 Fetching latest state for origin/main.'
git fetch origin main

echo '🔏 Checking local Git and GPG signing configuration.'
bash "${repository_root}/scripts/git/check-commit-signing-configuration.sh"

echo "🎋 Checking that ${current_branch} already contains origin/main."
if ! git merge-base --is-ancestor origin/main HEAD; then
  echo '❌ Current branch is not up to date with origin/main. Rebase or merge origin/main first.' >&2
  exit 1
fi

branch_commit_count="$(git rev-list --count 'origin/main..HEAD')"
if [[ "${branch_commit_count}" == '0' ]]; then
  echo '✅ No branch commits found to re-sign relative to origin/main.'
  exit 0
fi

original_head_commit="$(git rev-parse HEAD)"
original_head_tree="$(git rev-parse "HEAD^{tree}")"

first_unsigned_commit=''
while read -r commit_sha signature_status; do
  [[ -n "${commit_sha}" ]] || continue

  if [[ "${signature_status}" != 'G' && "${signature_status}" != 'U' ]]; then
    first_unsigned_commit="${commit_sha}"
    break
  fi
done < <(git rev-list --reverse --format='%H %G?' 'origin/main..HEAD' | sed '/^commit /d')

if [[ -z "${first_unsigned_commit}" ]]; then
  echo '✅ All branch commits already have valid or trusted signatures.'
  exit 0
fi

rewrite_base_commit="$(git rev-parse "${first_unsigned_commit}^")"
rewrite_commit_count="$(git rev-list --count "${rewrite_base_commit}..HEAD")"

backup_timestamp="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
backup_branch="backup/${current_branch}/${backup_timestamp}"
temporary_branch="tmp/sign-commits/${current_branch//\//-}/${backup_timestamp}"

echo "🪾 Creating backup branch ${backup_branch}."
git branch "${backup_branch}"

if ! git show-ref --verify --quiet "refs/heads/${backup_branch}"; then
  echo "❌ Backup branch ${backup_branch} could not be verified." >&2
  exit 1
fi

echo "🧪 Creating temporary rewrite branch ${temporary_branch}."
git switch -c "${temporary_branch}" >/dev/null

echo "✍️ Re-signing ${rewrite_commit_count} commit(s) on ${current_branch} starting at ${first_unsigned_commit}."
if ! GIT_SEQUENCE_EDITOR=: GIT_EDITOR=: git rebase --exec 'git commit --amend --no-edit -S --no-verify --allow-empty' "${rewrite_base_commit}"; then
  git rebase --abort >/dev/null 2>&1 || true
  git switch "${current_branch}" >/dev/null 2>&1 || true
  echo "❌ Re-signing failed during rebase. The original branch was left unchanged. Inspect ${temporary_branch} or recover with: git switch \"${backup_branch}\"" >&2
  exit 1
fi

rewritten_head_tree="$(git rev-parse "HEAD^{tree}")"
if [[ "${rewritten_head_tree}" != "${original_head_tree}" ]]; then
  echo '🧾 Final tree differs from the original branch tip.' >&2
  git diff --stat "${original_head_commit}"..HEAD >&2
  git switch "${current_branch}" >/dev/null 2>&1 || true
  echo "❌ Re-signing changed the final code unexpectedly. The original branch was left unchanged. Inspect ${temporary_branch} or recover with: git switch \"${backup_branch}\"" >&2
  exit 1
fi

echo "🔁 Updating ${current_branch} to the verified rewritten history."
git switch "${current_branch}" >/dev/null
git reset --hard "${temporary_branch}" >/dev/null

echo '🔍 Verifying signatures on rewritten commits.'
unsigned_commit_count='0'
while read -r commit_sha signature_status; do
  [[ -n "${commit_sha}" ]] || continue

  if [[ "${signature_status}" != 'G' && "${signature_status}" != 'U' ]]; then
    echo "❌ Commit ${commit_sha} is not signed with a valid or trusted signature status (${signature_status})." >&2
    unsigned_commit_count='1'
  fi
done < <(git log --format='%H %G?' 'origin/main..HEAD')

if [[ "${unsigned_commit_count}" != '0' ]]; then
  echo "❌ One or more rewritten commits are still unsigned. Recover with: git switch \"${backup_branch}\"" >&2
  exit 1
fi

echo '🧾 Checking that the final tree still matches the original branch tip.'
if [[ "$(git rev-parse "HEAD^{tree}")" != "${original_head_tree}" ]]; then
  git diff --stat "${original_head_commit}"..HEAD >&2
  echo "❌ Re-signing changed file contents unexpectedly. Recover with: git switch \"${backup_branch}\"" >&2
  exit 1
fi

git branch -D "${temporary_branch}" >/dev/null 2>&1 || true

echo '🫸 Pushing the rewritten branch with force-with-lease.'
git push --force-with-lease

echo "✅ Re-signed ${rewrite_commit_count} commit(s) on ${current_branch}."
echo "🔒 Backup branch preserved at ${backup_branch}."
