# Dev Container Configuration

This directory contains the development container configuration for the codebase. The dev container provides a fully configured, reproducible development environment with all required tools pre-installed.

## Purpose

The dev container eliminates "works on my machine" issues by standardizing:

- **Node.js 22.20.0** - Matching `engines.node` in root `package.json`
- **pnpm 10.20.0** - Matching `packageManager` in root `package.json`
- **Supabase CLI** - For database migrations and type generation (lexico)
- **kubectl & Helm** - For Kubernetes deployments
- **Terraform** - For Linode LKE cluster provisioning
- **GitHub CLI** - For repository operations
- **Docker** - Docker-in-Docker (Codespaces) or Docker-outside-of-Docker (local machine) for running Supabase local stack
- **SQLite** - CLI tool for querying and managing SQLite databases (caelundas ephemeris caching)

## Quick Start

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and [VS Code Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open the codebase folder in VS Code
3. Open the command palette (`Ctrl/Cmd+Shift+P`) → **Dev Containers: Reopen in Container**
4. When prompted to select a configuration, choose:
   - **Codebase Devcontainer (Local)** — for local development (Docker outside of Docker)
   - **Codebase Devcontainer (Cloud)** — for GitHub Codespaces or if you want isolated Docker (Docker in Docker)
5. Wait for container build (~2-3 minutes first time, cached after)
6. Terminal opens with all tools ready

> **Tip:** On a local machine, the `Local` configuration is strongly recommended. It shares your host's Docker daemon (faster builds, shared image cache, no memory overhead from a second Docker daemon). Codespaces must use the `Cloud` configuration since no host Docker socket is available.

## Configurations

Two named configurations are provided. Select the appropriate one when opening in a container.

| Configuration                   | File                      | Docker mode                     | Use when                                             |
| ------------------------------- | ------------------------- | ------------------------------- | ---------------------------------------------------- |
| `Codebase Devcontainer (Cloud)` | `cloud/devcontainer.json` | Docker-in-Docker (DinD)         | GitHub Codespaces, CI, or when isolation is required |
| `Codebase Devcontainer (Local)` | `local/devcontainer.json` | Docker-outside-of-Docker (DooD) | Local machine with Docker Desktop running            |

**DooD advantages on a local machine:**

- Shared image/layer cache with the host — no re-pulling Supabase or Ollama images
- No second Docker daemon — saves ~200–500 MB RAM and eliminates DinD startup delay
- Host OS manages container memory directly — no `--memory` cap needed in `runArgs`

**DinD advantages:**

- Completely isolated Docker environment — no interference with host containers
- Works in environments without a host socket (Codespaces, CI runners)

## Architecture

Two named configs live side-by-side, each edited directly. Common fields are kept in sync by the `sync-devcontainer-configuration` script.

```text
.devcontainer/
├── local/
│   └── devcontainer.json      ← Primary: DooD (source of truth for common fields)
└── cloud/
    └── devcontainer.json      ← Secondary: DinD (edit docker feature / runArgs directly)
```

**What is synced** (local is source of truth, propagated into cloud):

- `customizations` (extensions, recommendations), `remoteEnv`, `forwardPorts`, `portsAttributes`,
  `image`, `containerUser`/`remoteUser`, lifecycle scripts (`postCreateCommand`, etc.), `$schema`
- Shared features (github-cli, kubectl, terraform, etc.) — each config's Docker feature is preserved
- Shared mounts (node-modules, pnpm) — cloud's docker-storage volume is preserved

**What is not synced** (each config is source of truth):

- `name`, `runArgs`, Docker feature (`docker-in-docker` / `docker-outside-of-docker`)

To make changes:

1. Edit `local/devcontainer.json` for common settings (extensions, ports, env, feature versions, etc.) and run:

   ```bash
   nx run codebase:sync-devcontainer-configuration:write
   ```

2. Edit `cloud/devcontainer.json` or `local/devcontainer.json` directly for environment-specific settings — no sync needed

The pre-commit hook automatically validates that common fields are in sync whenever any devcontainer file is staged.

## Included Features

The container uses [Dev Container Features](https://containers.dev/features) for modular tool installation:

| Feature                    | Version | Purpose                                        | Config     |
| -------------------------- | ------- | ---------------------------------------------- | ---------- |
| `typescript-node:22`       | Base    | Node.js 22 with TypeScript support             | Both       |
| `docker-in-docker`         | 2       | Isolated Docker daemon inside container (DinD) | Cloud only |
| `docker-outside-of-docker` | 1       | Mounts host Docker socket (DooD)               | Local only |
| `github-cli`               | 1       | `gh` command for GitHub operations             | Both       |
| `kubectl-helm-minikube`    | 1       | kubectl and Helm (minikube disabled)           | Both       |
| `terraform`                | 1       | Terraform CLI + tflint for infrastructure      | Both       |

### Custom Installations

- **Supabase CLI**: Installed from GitHub releases in `postCreateCommand` (npm wrapper is broken for global installs)
- **SQLite**: Installed via `apt-get` in `postCreateCommand` for database querying and management
- **pnpm**: Activated via Corepack with exact version 10.20.0

## VS Code Extensions

The container auto-installs **66 extensions** organized by category. The full list is in [`devcontainer.json`](devcontainer.json) under `customizations.vscode.extensions`.

**Key categories:**

| Category            | Extensions                                                                 |
| ------------------- | -------------------------------------------------------------------------- |
| **Code Quality**    | ESLint, Prettier, Prettier-ESLint, Ruff                                    |
| **Web Development** | Tailwind CSS, HTML-CSS, GraphQL, Template String Converter                 |
| **Codebase/Build**  | Nx Console, Version Lens, NPM Intellisense                                 |
| **Database**        | Database Client, SQL Formatter, Prettier SQL                               |
| **Git/GitHub**      | Git History, GitHub Actions, GitHub PRs, Conventional Commits, Codeowners  |
| **Testing**         | Jest Runner                                                                |
| **Infrastructure**  | Docker, Kubernetes Tools, Terraform, HashiCorp HCL                         |
| **Languages**       | Python, Pylance, YAML, TOML, Jinja, Markdown                               |
| **Productivity**    | Better Comments, Path Intellisense, File Utils, Rainbow CSV, Spell Checker |
| **Visual**          | Material Icon Theme, Indent Rainbow, Pretty TS Errors, Output Colorizer    |

**Note:** Some extensions like GitLens, Docker (legacy), and Vitest Explorer are in `unwantedRecommendations` to prevent VS Code from suggesting them, as they conflict with preferred alternatives or are not needed in this environment.

## Port Forwarding

Ports are automatically forwarded to your host machine:

| Port  | Service             | Auto-Forward | Notes                     |
| ----- | ------------------- | ------------ | ------------------------- |
| 3000  | Lexico Dev Server   | Notify       | TanStack Start dev server |
| 54321 | Supabase API        | Silent       | PostgREST API endpoint    |
| 54322 | Supabase PostgreSQL | Silent       | Direct database access    |
| 54323 | Supabase Studio     | Notify       | Database admin UI         |
| 54324 | Supabase Inbucket   | Silent       | Local email testing       |
| 54325 | Supabase Analytics  | Silent       | Analytics dashboard       |

## Lifecycle Scripts

| Hook                | Tasks                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| `postCreateCommand` | Enable pnpm via Corepack, install dependencies, sync VS Code Machine settings |
| `postAttachCommand` | Verify tool versions (node, pnpm, supabase, gh, helm)                         |

## Scripts

The `.devcontainer/scripts` directory contains helper scripts for container setup:

| Script                    | Purpose                                                                                               | Called From         |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------- |
| `post-create-command.sh`  | Enables pnpm, installs dependencies                                                                   | `postCreateCommand` |
| `post-attach-command.sh`  | Verifies installed tool versions (Node.js, pnpm, Supabase CLI, etc.)                                  | `postAttachCommand` |
| `sync-vscode-settings.ts` | Merges `.vscode/settings.json` into VS Code Machine settings so workspace settings apply in-container | `postCreateCommand` |
| `test-devcontainer.sh`    | Validates tool versions and configuration; runnable locally and in CI                                 | Manual / CI         |

## Testing

The `test-devcontainer.sh` script in `.devcontainer/scripts/` validates tool installations and configuration. It can be run both locally inside the container and in CI.

| Check                         | What it validates                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Node.js version               | `node --version` starts with `v22.` (matches `package.json` `engines`)                        |
| pnpm version                  | `pnpm --version` is exactly `10.20.0` (matches `package.json` `packageManager`)               |
| Tool availability             | `nx`, `supabase`, `jq`, `yamllint`, `sqlite3` all respond                                     |
| Container user                | Running as `root`, confirming `containerUser`/`remoteUser`                                    |
| Environment variables         | `KUBECONFIG`, `NODE_OPTIONS`, `UV_THREADPOOL_SIZE` are set from `remoteEnv`                   |
| Pinned feature versions       | `gh`, `terraform`, `tflint`, `helm`, `kubectl`, `python3` match `devcontainer.json` pins      |
| Toolchain dependencies        | `corepack`, `tsx`, `git`, `npm`, `npx` are available                                          |
| Post-create artifacts         | `node_modules/` and `.nx/graph.json` exist (validates `postCreateCommand` ran)                |
| Script permissions            | All `.devcontainer/scripts/*.sh` files are executable                                         |
| Extensions sync               | `extensions` and `recommendations` arrays in `devcontainer.json` match                        |
| Workspace structure           | `applications/`, `packages/`, `infrastructure/`, `tools/` dirs exist (mount sanity)           |
| Docker (DinD)                 | Docker daemon is reachable and `docker compose` is available                                  |
| VS Code Machine settings sync | `.vscode/settings.json` is applied to Machine settings (skipped when VS Code is not attached) |

### Run tests locally

Open a terminal inside the devcontainer and run:

```bash
bash .devcontainer/scripts/test-devcontainer.sh
```

Exit code is `0` if all tests pass, `1` if any fail.

### Run tests in CI

The `🧑‍🏭 Devcontainer` target in [`.github/workflows/continuous-deployment.yml`](../.github/workflows/continuous-deployment.yml) builds the container image and executes the test script inside it. It runs on pull requests and on pushes to `main` that change a file the image or its test reads: `.devcontainer/**`, `.env.default`, `infrastructure/docker/docker-compose.yml`, the workflow itself, or the `packageManager` pin in `package.json`. Only pushes to `main` publish the image.

Pushes to `main` publish `ghcr.io/organizzolini/codebase-devcontainer:latest`, and that image is both the usable image and the build cache. This configuration is compose-based, and for compose configurations the devcontainer CLI bakes `BUILDKIT_INLINE_CACHE=1` into the feature build, so the published image carries its own layer metadata and the next run's `cacheFrom` resolves against it. Pull the image to run the devcontainer without building it.

There is deliberately no separate cache tag. The CLI refuses `--cache-to` for a compose configuration — `--cache-to not supported.`, a hard build failure rather than a degraded run — along with `--push` and `--output`. Pushing is done by the action afterwards rather than by the CLI, which is why `push: filter` works where `--push` would not.

What the cache is worth, measured across the two runs either side of it being seeded:

| | Build | Test | Push | Total |
| --- | ----- | ---- | ---- | ----- |
| Cold, no cache | 10m51s | 1m50s | 1m12s | 14m01s |
| Warm, every feature layer `CACHED` | 1m26s | 2m04s | — | 3m39s |

Roughly six and a half of those cold minutes are the `python` feature compiling CPython from source under `optimize: true`. That cost is now paid only when a change invalidates that layer.

A change under `.devcontainer/**` is cold from whichever feature layer it touches onward, so editing an early feature still costs close to the cold figure while editing a late one does not. The job's twenty-minute timeout is sized for that cold case rather than the common one.

Note the standing tension: the job only triggers on `.devcontainer/**` changes, which are exactly the changes that invalidate feature layers. The `python` feature is layer 11 of 16, so a change that lands in a later layer still reuses it, while one landing earlier does not.

## Customization

### Adding Extensions

Edit `customizations.vscode.extensions` in `devcontainer.json`:

```jsonc
"customizations": {
  "vscode": {
    "extensions": [
      // ... existing extensions
      "your.extension-id"
    ]
  }
}
```

### Adding VS Code Settings

Edit `customizations.vscode.settings` in `devcontainer.json`:

```jsonc
"customizations": {
  "vscode": {
    "settings": {
      // ... existing settings
      "your.setting": "value"
    }
  }
}
```

### Environment Variables

Add to `remoteEnv` in `devcontainer.json`:

```jsonc
"remoteEnv": {
  "NODE_OPTIONS": "--max-old-space-size=4096",
  "YOUR_VAR": "value"
}
```

For secrets, create `.devcontainer/.env` (gitignored) and reference in `remoteEnv`.

## Troubleshooting

### Container fails to build

1. Ensure Docker Desktop is running
2. Try `Dev Containers: Rebuild Container` from command palette
3. Check Docker has sufficient resources (8GB RAM recommended)

### Docker commands fail inside container

The container uses Docker-in-Docker (DinD) with an isolated Docker daemon:

1. Verify the DinD daemon is running: `docker info`
2. If daemon not running, rebuild the container: `Dev Containers: Rebuild Container`
3. Container user (`root`) should have docker group membership automatically

### DNS/Network issues in Docker-in-Docker

The devcontainer includes DNS configuration to fix common Docker-in-Docker networking issues:

- **Container DNS**: Configured via `runArgs` with `--dns` flags (Google DNS: 8.8.8.8, 8.8.4.4 and Cloudflare: 1.1.1.1)
- **Docker Daemon DNS**: Configured via `/etc/docker/daemon.json` in `configure-docker-dns.sh`

If you still encounter `Could not resolve host` errors:

1. Verify DNS is working: `nslookup google.com`
2. Check `/etc/resolv.conf` has nameservers
3. Test basic connectivity: `ping -c 3 8.8.8.8`
4. Rebuild container completely: `Dev Containers: Rebuild Container Without Cache`

### Supabase CLI not found

Install manually from GitHub releases:

```bash
VERSION=$(curl -s https://api.github.com/repos/supabase/cli/releases/latest | grep '"tag_name":' | cut -d '"' -f 4)
curl -fsSL "https://github.com/supabase/cli/releases/download/${VERSION}/supabase_linux_amd64.tar.gz" | sudo tar -xz -C /usr/local/bin
```

### pnpm version mismatch

Corepack should handle this automatically. If issues persist:

```bash
corepack enable
corepack prepare pnpm@10.20.0 --activate
```

### Port already in use

If host already uses a forwarded port:

1. Stop the conflicting service on host
2. Or modify `forwardPorts` in `devcontainer.json` to use different ports

### Slow file system performance (macOS)

Docker Desktop on macOS can have slow I/O with large node_modules:

1. Ensure "Use VirtioFS" is enabled in Docker Desktop settings
2. Consider using `Named Volume` mount for node_modules (advanced)

## Manual Testing Checklist

After building the container, verify the following:

```bash
# 1. Check tool versions
node --version          # Should output v22.20.0
pnpm --version          # Should output 10.20.0
supabase --version      # Should output version number
gh --version            # Should output gh version X.Y.Z
helm version --short    # Should output vX.Y.Z
kubectl version --client # Should output client version

# 2. Verify Docker access
docker run hello-world  # Should complete successfully

# 3. Install dependencies
pnpm install            # Should complete with no errors

# 4. Start Supabase (lexico)
nx run lexico-web:supabase:start  # All services should start

# 5. Start dev server
nx run lexico-web:develop   # Should be accessible at localhost:3000

# 6. Run tests
nx run-many --target=test --all  # Tests should pass
```

## Architecture Notes

### Docker-in-Docker vs Docker-outside-of-Docker

The default (`devcontainer.json`) runs an **isolated Docker daemon** inside the container (DinD):

- **Codespaces compatible**: Required when no host Docker socket is available
- **Better isolation**: Container Docker is completely separate from host Docker
- **Portable**: Same setup works in CI and cloud environments without modification

Tradeoffs:

- **Separate image cache**: Images download separately, not shared with host
- **RAM overhead**: DinD daemon uses ~200–500 MB additional RAM
- **Startup delay**: ~5–10 seconds for DinD daemon initialization
- **Memory pressure**: On memory-constrained machines, running both the DinD daemon and models like `qwen3.5:4b` (~3.3 GB) can exhaust available RAM

The local configuration (`local/devcontainer.json`) **mounts the host Docker socket** (DooD):

- **Faster builds**: Shares host image/layer cache — no re-pulling Supabase, Ollama images
- **No memory overhead**: No second daemon; host OS manages all container memory directly
- **Prerequisite**: Docker Desktop must be running on the host machine

### Why a single codebase container?

Instead of per-project devcontainers (lexico, caelundas, etc.):

- Nx development typically spans multiple projects
- Shared tooling is more efficient (one kubectl, one Supabase CLI)
- Simpler maintenance with single configuration
- Nx task orchestration benefits from unified access

## Related Documentation

- [CONTRIBUTING.md](../.github/CONTRIBUTING.md) - Development workflow
- [AGENTS.md](../AGENTS.md) - AI agent guidance
- [Dev Container Specification](https://containers.dev/implementors/spec/)
- [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
