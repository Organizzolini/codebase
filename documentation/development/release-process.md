# Release Process

Releases are fully automated on merge to `main`:

1. `nx release version` determines and writes each ic-suite package's version from conventional commits.
2. `nx release publish` publishes the ic-suite packages to npm.
3. [semantic-release](https://semantic-release.gitbook.io/) bumps the root `package.json` version, generates GitHub release notes, and updates `CHANGELOG.md`.

Nx release owns the independent ic-suite package versions (tagged `<project>@<version>`); semantic-release owns the single codebase version (tagged `v<version>`).

A new publishable package starts at `0.0.0`, which the conformetry templates already write. Nx treats the manifest version as the one already released: with no `<project>@<version>` tag yet, it bumps from that version using the package's whole commit history. Starting at `0.0.0` makes the first release `0.0.1` when that history resolves to a patch, which covers `feat` and `fix` commits on a `0.x` package. A breaking change in the history makes it `0.1.0` instead.
