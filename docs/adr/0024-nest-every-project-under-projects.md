# 0024: Nest Every Project Under `projects/`

## Context

Projects lived in three top-level folders: `applications/`, `packages/`, and `tools/`. The folder said what kind of project a directory held, but nothing read it that way. The module-boundary rules read the `type:application` and `type:package` tags, every `project.json` sets `projectType` explicitly, and Nx itself discovers projects through `project.json` and the pnpm workspace globs at any depth.

The folders also split each domain apart. Lexico's web application, API, and command line sat in an `applications/lexico/` grouping folder, while the entities package they share sat in `packages/`. Caelundas and meanderaw had each grown a grouping folder under `applications/` too, and the IC suite had one under `packages/`.

## Decision

**Every project lives at `projects/<project>/`.** A domain with several projects, or one that expects more, groups them one level deeper, and the IC suite keeps its own two levels.

| Folder                           | Projects                                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `projects/`                      | `affirmancy`, `components-web`, `database`, `logging`, `synchronization`, `validation`, and the uninitialized `JimmyPaolini` submodule |
| `projects/caelundas/`            | `caelundas-cli`, `caelundas-web`                                                                                                       |
| `projects/lexico/`               | `lexico-api`, `lexico-cli`, `lexico-entities`, `lexico-web`                                                                            |
| `projects/meanderaw/`            | `meanderaw-cli`, `meanderaw-web`                                                                                                       |
| `projects/ic-suite/<toolchain>/` | the callidescope, codependix, codometer, and conformetry packages                                                                      |

**A project's tag, not its folder, says whether it is an application or a package.** `type:application` and `type:package` are already what the boundary rules read.

**`nx.json` sets `workspaceLayout` to `projects` for both `appsDir` and `libsDir`.** Nx 23 reads that setting in two places. The package.json plugin guesses `projectType` from a path prefix, and every explicit `projectType` overrides that guess. `@nx/eslint-plugin` flags imports written from the workspace root, and pointing it at `projects/` keeps that check covering every project.

**`pnpm-workspace.yaml` matches `projects/*`, adds one glob per grouping folder, and negates each grouping folder itself**, as `applications/*` and `packages/*` did before. Sherif 1.10.0 cannot expand a glob with a wildcard in the middle, so a single `projects/*/*` glob reads to it as matching no package. In `write` mode its fix then deletes the glob.

## Consequences

- A new grouping folder needs a glob and a negation in `pnpm-workspace.yaml`, a `fallow.config.jsonc` ignore, a named entry in `codebase-structure.json`, and its projects in the three-directories-deep `codometer` and `stylelint` overrides in `nx.json`.
- Gitignore-style patterns that name the folder must be anchored, as `/projects/` is in `.codometerignore`. `callidescope-nx` and `conformetry-nx` both have a `src/modules/projects/` folder, and an unanchored `projects/` pattern silently matches it.
- `check-catalog-manifests` now scans every depth below `projects/`. Its old one-level scan never reached the IC suite or the caelundas and meanderaw grouping folders.
