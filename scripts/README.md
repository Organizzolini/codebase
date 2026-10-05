# Scripts

Utility scripts for codebase setup, maintenance, and development workflows.

## Overview

This directory contains shell scripts for:

- **Local setup** - macOS-specific initial codebase configuration (in `local/`)
- **Shell utilities** - Common terminal operations
- **Nx** - The CI steps around Nx: its affected runs and the task-result database CI caches (in `nx/`)
- **Release** - The CI steps that version and publish the ic-suite packages (in `release/`)

## Quick Start

### Initial Setup (macOS)

Run the main setup script to configure your local development environment:

```bash
./scripts/local/setup.sh
```

This runs the following in sequence:

1. `software.sh` - Installs required software (Homebrew, nvm, Node.js, pnpm, uv, Python, Ollama, Terraform, and more)
2. `environment.sh` - Creates `.env` files and configures environment variables
3. `dependencies.sh` - Installs npm and Python dependencies

> **Note:** If using a devcontainer, these scripts are not needed — the devcontainer handles setup automatically via `.devcontainer/scripts/post-create-command.sh`.

## Local Setup Scripts

These scripts live in `scripts/local/` and are intended for **macOS local development only**.
The devcontainer handles equivalent setup automatically.

### setup.sh

**Purpose:** Complete codebase setup in one command

**Usage:**

```bash
./scripts/local/setup.sh
```

**What it does:**

- Validates codebase root directory
- Sources utilities for common functions
- Installs required software (Homebrew, nvm, Node.js, pnpm, uv, Python, Ollama, etc.)
- Configures environment from `.env`
- Installs all npm and Python dependencies

**Prerequisites:**

- Must be run from codebase root directory
- Requires `.env` file with environment variables

### software.sh

**Purpose:** Install and update required development tools

**Usage:**

```bash
./scripts/local/software.sh
```

**Checks/Installs:**

- **Homebrew** - Package manager for macOS/Linux
- **nvm** - Node Version Manager
- **Node.js** - Runtime (version from `.nvmrc`)
- **pnpm** - Fast, disk space efficient package manager
- **uv** - Python package manager
- **Python** - 3.11+ (via Homebrew)
- **Ollama** - Local LLM server (starts service, pulls `gemma4:e2b`)
- **Terraform** - Infrastructure as code
- **yamllint** - YAML linting
- **Supabase CLI** - Supabase local development
- **jq** - JSON processor
- **GitHub CLI** - GitHub operations from terminal
- **Helm** - Kubernetes package manager
- **kubectl** - Kubernetes CLI

**Behavior:**

- Skips installation if tool already exists
- Checks for updates and prompts to upgrade
- Exits with error if Homebrew is missing

### dependencies.sh

**Purpose:** Install all project dependencies (Node.js and Python)

**Usage:**

```bash
./scripts/local/dependencies.sh
```

**What it does:**

- Runs `pnpm install` in codebase root
- Installs dependencies for all workspace packages
- Runs `uv sync` in codebase root for the uv workspace Python dependencies
- Respects lockfiles for reproducible builds

### environment.sh

**Purpose:** Configure environment variables and create `.env` files

**Usage:**

```bash
./scripts/local/environment.sh
```

**What it does:**

- Creates `.env` from `.env.default` for root, lexico, and caelundas (if not already present)
- Appends `LOCAL_WORKSPACE_FOLDER=$(pwd)` to root `.env` for docker-compose volume mounts
- Sources `.env` file and exports environment variables

### install-skills.sh

**Purpose:** Restore the skills declared in `skills-lock.json` into their gitignored `.agents/skills/<name>/` folders, so every environment that installs node dependencies holds the skills that `AGENTS.md` links to

**Usage:**

```bash
# Via Nx (recommended)
pnpm exec nx run codebase:install-skills

# Re-restore skills that are present but damaged
pnpm exec nx run codebase:install-skills --configuration=force

# Direct
./scripts/install-skills.sh
```

**Use cases:**

- Root `postinstall` (automatically run by every `pnpm install`)
- Fresh clones, devcontainers, CI jobs, and Claude Code worktrees
- Manual repair when a skill named in `AGENTS.md` is missing

**Behavior:**

- Idempotent — returns in milliseconds when every locked skill is already present
- Reverts the hashes that `skills experimental_install` rewrites into `skills-lock.json`, so an install never dirties the tree. Pins move via `pnpm exec skills update`, which `upgrade-dependencies.yml` runs weekly
- Non-fatal — a GitHub outage warns and prints the retry command rather than failing the install

**Environment variables:**

- `SKIP_SKILLS_INSTALL=1` - Skip restoration entirely
- `SKILLS_INSTALL_FORCE=1` - Re-restore even when every skill is present

**Exit codes:**

- `0` - Always, by design; skills are agent context, not a build input

### sync-vscode-extensions.ts

> Located in `.devcontainer/scripts/sync-vscode-extensions.ts`

**Purpose:** Sync VS Code extensions between `.vscode/extensions.json` and both devcontainer configurations (`.devcontainer/local/devcontainer.json` and `.devcontainer/cloud/devcontainer.json`).

**Usage:**

```bash
# Via Nx (recommended)
nx run codebase:sync-vscode-extensions:check    # Validate both configs are in sync (default)
nx run codebase:sync-vscode-extensions:write    # Update both devcontainer.json files

# Direct
tsx .devcontainer/scripts/sync-vscode-extensions.ts [check|write]
```

**Use cases:**

- Pre-commit hook (auto-runs when `.vscode/extensions.json` or either devcontainer file is staged)
- Manual sync after adding extensions

**Exit codes:**

- `0` - In sync or successfully synced
- `1` - Out of sync (check mode) or failed

### sync-devcontainer-configuration.ts

**Purpose:** Propagate common fields from the local devcontainer config into the cloud config. Local is the source of truth for shared settings; cloud is edited directly only for its Docker feature and `runArgs`.

**Synced fields** (local is source of truth):

- `customizations`, `remoteEnv`, `forwardPorts`, `portsAttributes`, `image`, `containerUser`, `remoteUser`, lifecycle scripts, `$schema`
- Shared features (github-cli, kubectl, terraform, etc.) — each config's Docker feature is preserved
- Shared mounts (node-modules, pnpm) — cloud's docker-storage volume is preserved

**Preserved fields** (each config is source of truth):

- `name`, `runArgs`, Docker feature (`docker-in-docker` / `docker-outside-of-docker`)

**Usage:**

```bash
# Via Nx (recommended)
nx run codebase:sync-devcontainer-configuration:check    # Validate cloud config is in sync (default)
nx run codebase:sync-devcontainer-configuration:write    # Propagate common fields from local into cloud

# Direct
tsx scripts/sync-devcontainer-configuration.ts [check|write]
```

**Use cases:**

- Pre-commit hook (auto-runs when any devcontainer file is staged)
- After editing shared settings in `local/devcontainer.json` (run `write` to propagate)

**Exit codes:**

- `0` - In sync or successfully updated
- `1` - Out of sync (check mode) or failed

### utilities.sh

**Purpose:** Common utilities and helper functions

**Usage:**

```bash
source ./scripts/utilities.sh
```

**Functions:**

#### `get_git_commit_hash()`

Returns the first 7 characters of the current git commit hash.

```bash
commit=$(get_git_commit_hash)
echo "Commit: $commit"
# Output: Commit: abc1234
```

#### `get_utc_timestamp()`

Returns the current UTC timestamp in `YYYYMMDD-HHMMSS` format.

```bash
timestamp=$(get_utc_timestamp)
echo "Timestamp: $timestamp"
# Output: Timestamp: 20240125-143022
```

**Automatic behaviors:**

- Validates codebase root directory
- Exits immediately on error (`set -e`)
- Sources `.env` environment variables
- Makes all `.sh` files executable

## Shell Utilities

### shell/grep.sh

**Purpose:** Advanced grep with multi-casing support

**Usage:**

```bash
./scripts/shell/grep.sh <query> [grep_options] [file...]
```

**Function: `grep_all_cases`**

Searches for a term in all possible casings and spacings:

- camelCase: `myVariableName`
- PascalCase: `MyVariableName`
- snake_case: `my_variable_name`
- kebab-case: `my-variable-name`
- space-separated: `my variable name`

**Examples:**

Search for "my variable name" in all casings:

```bash
./scripts/shell/grep.sh "myVariableName" src/
# Matches: myVariableName, my_variable_name, my-variable-name, etc.
```

Search with grep options:

```bash
./scripts/shell/grep.sh "variable" -r -n src/
# -r: recursive
# -n: show line numbers
```

**Standard grep usage:**

```bash
# Case insensitive
grep -i "word" file.txt

# Whole word search
grep -w "word" file.txt

# Recursive search
grep -r "word" .

# Count matches
grep -c "word" file.txt

# Find files with matches
grep -l "word" *

# Invert match (non-matching lines)
grep -v "word" file.txt

# With pipes
ps aux | grep "nginx"
ls -l | grep ".txt"
```

### shell/killport.sh

**Purpose:** Kill processes running on a specific port

**Usage:**

```bash
source ./scripts/shell/killport.sh
killport <port_number>
```

**Function: `killport(port)`**

Finds and kills all processes listening on the specified port.

**Examples:**

Kill process on port 3000:

```bash
source ./scripts/shell/killport.sh
killport 3000
```

**Output:**

- If no processes: `👍 No processes found running on port 3000`
- If processes found: Shows process name and PID, then kills them

**Use cases:**

- Free up port for development server
- Clean up orphaned processes
- Force restart of services

### shell/netstat.sh

**Purpose:** Network statistics and connection monitoring

**Usage:**

```bash
./scripts/shell/netstat.sh [options]
```

See script for specific netstat usage patterns.

### shell/sed.sh

**Purpose:** Stream editor for text transformation

**Usage:**

```bash
./scripts/shell/sed.sh [options]
```

See script for specific sed usage patterns and examples.

## Nx Scripts

These scripts live in `scripts/nx/`, and the composite actions in
`.github/actions/` run them. Each script is its own command. Helpers shared
between commands live in a sourced file beside them.

### Task-Result Database

The `setup-codebase` and `cleanup-codebase` actions run these around CI's Nx
cache restore and save, and all of them source `task-database.sh` for the
shared helpers.

Nx decides a cache hit only from its task-result database,
`.nx/workspace-data/<machine-id>-v<schema>.db`. That file is named after the
machine, and every hosted runner is a fresh VM, so a restored database goes
unread unless it is adopted under the current machine's id.

| Script | Runs in | What it does |
| ------ | ------- | ------------ |
| `verify-task-database.sh` | setup and cleanup | Discards any database that fails `PRAGMA integrity_check` |
| `adopt-task-database.sh` | setup, after the restore | Renames the newest restored database to this machine's id and discards the rest |
| `keep-task-database.sh` | cleanup, before the save | Keeps only the newest database, and warns if there was more than one |
| `task-database.sh` | sourced by the above | Lists, picks, and discards databases along with their `-wal`, `-shm`, and `-journal` files |

All of them honour `NX_WORKSPACE_DATA_DIRECTORY`. `adopt-task-database.sh`
also reads `MACHINE_ID_FILES`, a space-separated list of files to take the id
from, in priority order. So the scripts can be exercised locally against a
scratch directory and a fake id:

```bash
NX_WORKSPACE_DATA_DIRECTORY=/tmp/nx-data MACHINE_ID_FILES=/tmp/machine-id \
  bash scripts/nx/adopt-task-database.sh
```

### Affected Runs

| Script | Runs in | What it does |
| ------ | ------- | ------------ |
| `bound-base-to-push.sh` | setup, after `nx-set-shas`, on a CI push with `nx-base: push-before` | Moves `NX_BASE` to the push's previous tip (`BEFORE`), keeping it when that is empty, all zeros, or not an ancestor of `NX_HEAD` |
| `run-affected.sh` | `run-affected` | Runs `nx affected` for `TARGET` over `--base`/`--head`, or over `--stdin` with spelling files dropped when the change set has any and `INCLUDE_SPELLING` is not `true` |

Both read everything from the environment, so either can be run locally. With
`pnpm` stubbed to print what it would have run:

```bash
mkdir -p /tmp/stub && printf '#!/bin/sh\necho "pnpm $*"; [ -t 0 ] || cat\n' >/tmp/stub/pnpm
chmod +x /tmp/stub/pnpm
PATH="/tmp/stub:$PATH" TARGET=test-code ARGUMENTS="--parallel=4" \
  NX_BASE=004d1f58c^ NX_HEAD=004d1f58c bash scripts/nx/run-affected.sh
BEFORE=c160aad5f NX_BASE=HEAD~5 NX_HEAD=007edad2e GITHUB_ENV=/tmp/github-env \
  bash scripts/nx/bound-base-to-push.sh
```

## Notepads

### notepads/notepad.sql

**Purpose:** SQL queries and database utilities for notepad/notes functionality

**Location:** `notepads/notepad.sql`

**Usage:**

```bash
# Run SQL file
psql -U username -d database -f notepads/notepad.sql

# Or copy queries into database client
```

See file for specific SQL queries and documentation.

## Best Practices

### Script Execution

**Always run from codebase root:**

```bash
# ✅ Correct
cd ~/Personal/codebase
./scripts/local/setup.sh

# ❌ Wrong
cd scripts
./setup.sh
```

**Make scripts executable:**

```bash
chmod +x scripts/**/*.sh
```

Or use the utilities.sh automatic behavior (makes all `.sh` files executable).

### Sourcing vs Executing

**Execute scripts** (standalone):

```bash
./scripts/local/setup.sh
```

**Source scripts** (use functions in current shell):

```bash
source ./scripts/utilities.sh
commit=$(get_git_commit_hash)
```

### Error Handling

Scripts use `set -e` to exit on error. Handle errors explicitly:

```bash
#!/bin/bash
set -e  # Exit on error

# This will stop execution if command fails
pnpm install

# Continue execution even if command fails
pnpm test || echo "⚠️ Tests failed but continuing..."
```

### Environment Variables

Load environment variables before using them:

```bash
# Load from .env
source ./scripts/utilities.sh  # Automatically sources .env

# Or manually
set -a
source .env
set +a
```

## Common Tasks

### Fresh Install

Complete codebase setup from scratch:

```bash
# 1. Clone repository
git clone https://github.com/Organizzolini/codebase.git
cd codebase

# 2. Create .env file
cp .env.example .env
# Edit .env with your values

# 3. Run setup
./scripts/local/setup.sh
```

### Update Dependencies

Update npm packages:

```bash
# Update all dependencies
pnpm update

# Or run dependencies script
./scripts/local/dependencies.sh
```

### Clean Install

Remove node_modules and reinstall:

```bash
# Remove all node_modules
pnpm clean

# Reinstall
./scripts/local/dependencies.sh
```

### Validate Lockfile

Check if lockfile needs updating:

```bash
pnpm exec nx run codebase:check-lockfile
```

If out of sync:

```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "chore(dependencies): update lockfile"
```

### Kill Development Servers

Free up ports for development:

```bash
source ./scripts/shell/killport.sh

# Kill common development ports
killport 3000  # React dev server
killport 5173  # Vite dev server
killport 54321 # Supabase local API
killport 54322 # Supabase local PostgreSQL
killport 54323 # Supabase Studio
```

### Search Across Codebase

Find code in all casings:

```bash
# Search for variable in all naming conventions
./scripts/shell/grep.sh "userName" -r src/

# Matches:
# - userName
# - user_name
# - user-name
# - UserName
# - user name
```

## Troubleshooting

### "Permission denied" errors

Make scripts executable:

```bash
chmod +x scripts/**/*.sh
```

Or source utilities which does this automatically:

```bash
source ./scripts/utilities.sh
```

### "Must be run from codebase root" error

Change to codebase root directory:

```bash
cd ~/Personal/codebase
```

Verify you're in the right place:

```bash
pwd
# Should output: .../Personal/codebase

ls package.json
# Should exist
```

### Environment variables not loading

Ensure `.env` file exists:

```bash
ls -la .env
```

Create from example if missing:

```bash
cp .env.example .env
```

Source utilities to load environment:

```bash
source ./scripts/utilities.sh
```

### pnpm not found

Install via Homebrew:

```bash
brew install pnpm
```

Or run software setup:

```bash
./scripts/local/software.sh
```

### Lockfile out of sync

Update lockfile:

```bash
pnpm install
```

Verify sync:

```bash
pnpm exec nx run codebase:check-lockfile
```

## Release Scripts

These scripts live in `scripts/release/`, and the release job of
`.github/workflows/continuous-deployment.yml` runs them in order, before
semantic-release releases the codebase itself.

| Script | Step | What it does |
| ------ | ---- | ------------ |
| `version-packages.sh` | 🏷️ Version Packages | Runs `nx release --skip-publish`, which versions each package and writes its `CHANGELOG.md`, then pushes the release commit to `main` and its `<project>@<version>` tags 6 at a time, since GitHub rejects a push that updates more than 6 refs |
| `publish-packages.sh` | 📦 Publish Packages | Publishes every release-group package not yet on npm, with provenance, then mirrors each package to GitHub Packages as `@<owner>/<project>` |
| `link-packages.sh` | 🔗 Link Packages | Creates a storage record on the organization's Linked artifacts page for every published npm version that has none, and lists the versions this run published for 🔏 Attest Packages |
| `release-group.sh` | sourced by the above | Lists the release group's project directories from `nx.json`, and names and checks a package's npm version |

They read everything from the environment, and all are safe to re-run: Nx
versions only what has changed since each package's last tag, pnpm skips a
version npm already has, and so is a version GitHub Packages already has or a
tarball that already has a storage record. `GITHUB_PACKAGES_REGISTRY` points the
mirror at another registry, such as `codebase:local-registry`, to try it
without touching GitHub.

## Contributing

### Adding New Scripts

1. Create script in appropriate directory:
   - Core scripts: `scripts/`
   - Shell utilities: `scripts/shell/`
   - Notepads: `notepads/`

2. Add shebang and description:

   ```bash
   #!/bin/bash
   #
   # Script description here
   #
   ```

3. Make executable:

   ```bash
   chmod +x scripts/your-script.sh
   ```

4. Document in this README

5. Test thoroughly:

   ```bash
   # Test from codebase root
   ./scripts/your-script.sh

   # Test with various inputs
   ./scripts/your-script.sh arg1 arg2
   ```

### Script Conventions

**File naming:**

- Use kebab-case: `install-skills.sh`
- Add `.sh` extension
- Descriptive names

**Code style:**

- Use `#!/bin/bash` shebang
- Add `set -e` for error handling
- Include usage comments
- Validate inputs
- Provide helpful error messages
- Use emoji for visual feedback (✅ ❌ 🔍 📦)

**Testing:**

- Test happy path
- Test error conditions
- Test from codebase root
- Test with missing dependencies

## Related Documentation

- [CONTRIBUTING.md](../.github/CONTRIBUTING.md) - Contribution guidelines
- [scripts/utilities.sh](./utilities.sh) - Common utility functions
- [.github/workflows/](../.github/workflows/) - CI/CD workflows using these scripts

## See Also

- [Homebrew Documentation](https://docs.brew.sh/)
- [pnpm Documentation](https://pnpm.io/)
- [Bash Scripting Guide](https://www.gnu.org/software/bash/manual/)
