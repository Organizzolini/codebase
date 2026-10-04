# Release Process

Releases are fully automated on merge to `main`:

1. `nx release version` determines and writes each ic-suite package's version from conventional commits, commits it, and tags each bumped package `<project>@<version>`. The workflow pushes the commit and tags itself, so the pre-push hook runs.
2. `pnpm -r publish --provenance` publishes every package in the Nx release group whose version is not on npm yet, each with an npm [provenance attestation](https://docs.npmjs.com/generating-provenance-statements) linking it to the commit and workflow run that built it. pnpm honors provenance only as that flag, which is why this step uses pnpm rather than `nx release publish`.
3. Each package tag without a GitHub release gets one, linking to the npm version and listing that package's commits since its previous tag. These are never marked Latest.
4. [semantic-release](https://semantic-release.gitbook.io/) bumps the root `package.json` version, generates GitHub release notes, and updates `CHANGELOG.md`.

Nx release owns the independent ic-suite package versions (tagged and released as `<project>@<version>`); semantic-release owns the single codebase version (tagged `v<version>`, and always the Latest release that the README version badge shows). A package's own badge filters the releases by its tag prefix, for example `https://img.shields.io/github/v/release/Organizzolini/codebase?filter=codometer-cli@*`.

A new publishable package needs `"version": "0.0.0"` added to its `package.json` by hand: the conformetry templates leave `version` out, because Nx owns it once the package is released and a pinned value would fail conformance on every bump. Nx and `npm publish` both need the field. Nx treats the manifest version as the one already released: with no `<project>@<version>` tag yet, it bumps from that version using the package's whole commit history. Starting at `0.0.0` makes the first release `0.0.1` when that history resolves to a patch, which covers `feat` and `fix` commits on a `0.x` package. A breaking change in the history makes it `0.1.0` instead.
