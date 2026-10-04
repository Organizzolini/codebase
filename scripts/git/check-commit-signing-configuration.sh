#!/usr/bin/env bash

set -e

commit_gpg_sign="$(git config --bool --get commit.gpgsign || true)"
if [[ "${commit_gpg_sign}" != "true" ]]; then
  echo "❌ Git commit signing is required. Set commit.gpgsign=true before committing." >&2
  exit 1
fi

signing_key="$(git config --get user.signingkey || true)"
if [[ -z "${signing_key}" ]]; then
  echo "❌ Git signing key is required. Set user.signingkey before committing." >&2
  exit 1
fi

if ! command -v gpg > /dev/null 2>&1; then
  echo "❌ gpg is required for commit signing but was not found in PATH." >&2
  exit 1
fi

if ! gpg --list-secret-keys --keyid-format=long "${signing_key}" | grep -q '^sec'; then
  echo "❌ No GPG secret key found for user.signingkey=${signing_key}." >&2
  exit 1
fi

# A key that exists and can sign is not necessarily the committer's own key. A
# developer with several GPG identities (work, personal) can end up with
# user.signingkey resolved to someone else's key — for example by a setup
# script that picks whichever secret key gpg happens to list first — and every
# check above still passes, so the resulting commits carry someone else's
# signature while showing this developer as the author. This is skipped in CI,
# where the committer identity is a bot/service account rather than a personal
# git user.email, and is driven by imported secrets rather than a local
# multi-identity keyring.
if [[ -z "${CI:-}" && -z "${GITHUB_ACTIONS:-}" ]]; then
  git_email="$(git config --get user.email || true)"
  if [[ -z "${git_email}" ]]; then
    echo "❌ Git user.email is required to verify the signing key's identity." >&2
    exit 1
  fi

  key_uid_emails="$(
    gpg --with-colons --list-secret-keys "${signing_key}" 2> /dev/null \
      | awk -F: '$1 == "uid" { print $10 }' \
      | grep -oE '<[^>]+>' \
      | tr -d '<>'
  )"

  if ! grep -qxF "${git_email}" <<< "${key_uid_emails}"; then
    echo "❌ Signing key user.signingkey=${signing_key} does not belong to ${git_email}." >&2
    echo "   Its GPG identity is: $(echo "${key_uid_emails}" | paste -sd', ' -)" >&2
    echo "   Set a signing key for ${git_email}, scoped to this repository:" >&2
    echo "     gpg --list-secret-keys --keyid-format=long ${git_email}" >&2
    echo "     git config user.signingkey <key-id>   # no --global: keep other repos untouched" >&2
    exit 1
  fi
fi

if [[ "${SKIP_GPG_SIGNING_SMOKE_TEST:-}" == "true" ]]; then
  exit 0
fi

# The smoke test signs a throwaway commit object. It runs in CI too, so that a
# key whose passphrase the agent cannot supply fails here in seconds rather than
# minutes later, when semantic-release writes the release commit and the whole
# release silently does not ship.
#
# Either way gpg is routed through a wrapper that never opens a pinentry, so the
# smoke test can only ever pass, fail, or be skipped — it can never block:
#
#   - CI uses loopback, because interactive pinentry cannot work on a headless
#     runner. It still uses a passphrase the agent has cached, but fails
#     immediately instead of trying to prompt for one.
#   - Local agents use cancel, because they share the developer's gpg-agent and a
#     GUI pinentry would hang a session-start hook until it times out. A cached
#     passphrase still signs normally; an uncached one fails in milliseconds and
#     is treated as inconclusive below.
if [[ -n "${CI:-}" || -n "${GITHUB_ACTIONS:-}" ]]; then
  pinentry_mode='loopback'
else
  pinentry_mode='cancel'
fi

gpg_program="$(git config --get gpg.program || true)"
gpg_wrapper="$(mktemp)"
smoke_test_stderr="$(mktemp)"
trap 'rm -f "$gpg_wrapper" "$smoke_test_stderr"' EXIT

cat > "${gpg_wrapper}" << GPG_WRAPPER
#!/usr/bin/env bash
exec ${gpg_program:-gpg} --batch --no-tty --pinentry-mode ${pinentry_mode} "\$@"
GPG_WRAPPER
chmod +x "${gpg_wrapper}"

git_options=(-c "gpg.program=${gpg_wrapper}")

tree_hash="$(git write-tree)"
test_commit_message='commit-signing-smoke-test'

parent_options=()
if git rev-parse --verify HEAD > /dev/null 2>&1; then
  parent_options+=(-p "$(git rev-parse HEAD)")
fi

if ! test_commit_hash="$(
  printf '%s' "${test_commit_message}" | \
    git "${git_options[@]}" commit-tree "${tree_hash}" "${parent_options[@]}" -S 2> "${smoke_test_stderr}"
)"; then
  # A cancelled pinentry only means the agent holds no cached passphrase. The key
  # itself is fine — the checks above proved it exists — and the next real commit
  # will prompt for it normally, so the smoke test is inconclusive, not failed.
  #
  # This never applies in CI: there the passphrase is preloaded into the agent, so
  # any signing failure is a real one that must fail the run rather than be
  # skipped.
  if [[ "${pinentry_mode}" == 'cancel' ]] && grep -q 'Operation cancelled' "${smoke_test_stderr}"; then
    exit 0
  fi

  # gpg's own stderr is replayed on purpose: it names the actual failure.
  cat "${smoke_test_stderr}" >&2
  echo "❌ Git commit signing smoke test failed: gpg could not sign with user.signingkey=${signing_key}." >&2
  echo '   Verify the GPG key and its passphrase match (GPG_PRIVATE_KEY / GPG_PASSPHRASE in CI).' >&2
  exit 1
fi

if ! git "${git_options[@]}" verify-commit "${test_commit_hash}" > /dev/null 2>&1; then
  echo '❌ Git commit signing smoke test failed: the test signature did not verify.' >&2
  exit 1
fi
