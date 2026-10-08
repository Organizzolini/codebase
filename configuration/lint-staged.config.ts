/**
 * Lint-staged configuration — runs checks on staged files during pre-commit.
 *
 * Each key is a glob pattern matching staged files, and its handler returns
 * an array of commands to run. Uses `nx affected` to scope checks to the
 * projects that own the changed files, plus codebase-level checks.
 *
 * Invoked by Husky's pre-commit hook via `npx lint-staged`.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * How many tasks one `nx affected` run may execute at once.
 *
 * This was pinned to 2 because the run exhausted memory and the operating
 * system killed it. That was blamed on `analyze-code` spawning a nested
 * `nx run` per tool, each with its own scheduler, so `--parallel` bounded the
 * outer process only. `lint-code` is an `nx:noop` whose work hangs off
 * `dependsOn`, so one scheduler now owns every task and this number means what
 * it says.
 *
 * lint-staged reports every killed command as "Task failed to spawn:
 * undefined", so that wording alone does not identify the cause. A run killed
 * for memory does some work first; one killed for an over-long argument dies
 * instantly with no output at all. See `getStagedFilesFlags`.
 *
 * In CI it is doubled, for the release commit, whose hook checks every bumped
 * package. v2.34.0's took 11m40s over 718 tasks with a critical path of 2m15s,
 * on a 4-CPU runner. The heaviest tasks, the per-project `codependix-gate` and
 * `callidescope-gate`, peak near 1.6 GB, so 8 stay under the runner's 16 GB.
 */
const ANALYSIS_PARALLELISM = process.env["CI"] ? 8 : 4;

/**
 * Renders staged paths as one workspace-relative `--files=` flag each.
 *
 * `--files` also accepts a single comma-separated value, but that value grows
 * without bound as a commit grows, and one over-long argument is enough to get
 * the whole run killed: Node 26 is killed by the operating system on any single
 * argument past 1011 bytes, before the script it was asked to run prints
 * anything. The commit then fails as lint-staged's "Task failed to spawn:
 * undefined" with no output to explain it, and the paths look guilty because
 * whichever one crosses the threshold appears to be the trigger. Nx unions
 * repeated `--files` flags, so the affected set is identical and every argument
 * stays path-sized.
 *
 * The workspace pins Node 24 in `.nvmrc`, which has no such limit. This keeps
 * the hook working on a Node that does.
 */
function getStagedFilesFlags(files: string[]): string {
  return files
    .map((file) => `--files=${path.relative(process.cwd(), file)}`)
    .join(" ");
}

/**
 * Hands `nx affected` the staged changes as two revisions, so it selects
 * projects the way CI's `scripts/nx/run-affected.sh` does.
 *
 * Given `--files`, Nx counts a file as changed in full. Given a base and a
 * head, it diffs `package.json` and `pnpm-lock.yaml` field by field. The
 * 2.31.0 release commit, a version bump plus regenerated markdown, selects 6
 * projects that way rather than 48, and a dependency bump selects only the
 * projects that use it.
 *
 * The head is a throwaway commit of the index on top of `HEAD`: lint-staged
 * stashes unstaged edits first, so the files the tasks read match it. It
 * stays unreferenced and is collected with other loose objects. A repository
 * with no `HEAD` yet falls back to `--files`.
 */
function getStagedRevisionFlags(files: string[]): string {
  try {
    const tree = runGit(["write-tree"]);
    const head = runGit([
      "commit-tree",
      tree,
      "-p",
      "HEAD",
      "--no-gpg-sign",
      "-m",
      "lint-staged: staged changes",
    ]);
    return `--base=HEAD --head=${head}`;
  } catch {
    return getStagedFilesFlags(files);
  }
}

/**
 * Runs one git command and returns its trimmed standard output. Its standard
 * error is captured rather than shown, so the expected failure with no `HEAD`
 * does not print a `fatal:` line into the hook's output.
 */
function runGit(gitArguments: string[]): string {
  return execFileSync("git", gitArguments, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const config = {
  // 🔒 Lockfile integrity
  // Run as the `validation` CLI rather than through its Nx target, which would
  // cost another project graph build for one command. No environment prefix:
  // lint-staged spawns commands without a shell, so `NODE_OPTIONS='' node …`
  // would be parsed as the executable name. The pre-commit hook already clears
  // `NODE_OPTIONS` for exactly the reason that prefix exists elsewhere, so
  // there is nothing left here to neutralize.
  //
  // What it checks is not a file's contents but whether a resolution still
  // holds: `pnpm install --frozen-lockfile --lockfile-only`, which no Nx target
  // models. It never writes node_modules, so it is safe to run beside the rest.
  "{**/package.json,pnpm-workspace.yaml}": (): string[] => [
    "node --import @swc-node/register/esm-register tools/validation/src/main.ts lockfile",
  ],

  // 📦 Manifest consistency
  // A manifest under a project makes only that project affected, but syncpack
  // and sherif compare every manifest against every other, so the root project
  // has to run whether or not `affected` selected it.
  "**/package.json": (): string[] => [
    "pnpm exec nx run-many --projects=codebase --targets=check-catalog-manifests,sherif,syncpack --outputStyle=static",
  ],

  // 🔬 Static analysis and conformetry validation
  // One `nx affected` run over the staged changes, on the same `lint-code`
  // target the Lint Codebase workflow runs and selecting projects the same
  // way it does, so what passes here passes there.

  // This replaces a table of per-path entries that mapped a changed file to
  // the target that cared about it. Nx already does that mapping: each leaf
  // declares the config files it reads in its own `inputs`, so touching
  // knip.config.ts or the PR template re-runs exactly the leaves it should and
  // cache-hits the rest. Doing it by hand duplicated that, and every entry
  // cost another project graph build.

  // Conformetry validates the whole workspace on every commit: generated
  // instances need not match a template-pattern glob to have drifted, so it
  // cannot be scoped to `affected`.

  // Each derivation synchronization is named alongside `lint-code` rather
  // than reached through its `dependsOn`, for the reason the Lint Codebase
  // workflow names them: each also publishes on the default branch, and Nx
  // forwards an explicit configuration down `dependsOn`, so an edge there
  // would let `lint-code --configuration=write` publish from a branch.

  // `callidescope-gate` and `codependix-gate` reach a commit through
  // `guard-code`'s `dependsOn` instead of being named here. Both are inferred
  // per project and have no configurations, so the `check` configuration below
  // falls through to their defaults. `nx affected` scopes each to the projects
  // a commit touched, so a commit that deepens one project's call stacks or
  // breaks one project's boundary fails that project's own task.
  // `codebase:codependix` is write-only and is not reached from here.

  // There is no aggregate `synchronize` target to name instead: each
  // synchronization is its own Nx target on the `synchronization` project, run
  // directly the way `codebase:codometer` and `codebase:callidescope` are —
  // named by whichever caller wants it rather than through a shared process
  // that loops over all of them.

  // `nx sync:check` no longer runs anywhere, on commit or otherwise: the
  // generator plugin it checked is emitted into .conformetry on install rather
  // than committed, so no commit can stage it out of date. Every conformetry
  // command re-checks the emitted plugin against the configuration instead. See
  // configuration/.husky/pre-commit for the retirement note. Were it ever
  // reinstated, it could not be prefixed here: lint-staged spawns commands
  // without a shell, so `NX_DAEMON=false nx ...` would be parsed as the
  // executable name.
  "*": (files: string[]): string[] => [
    `pnpm exec nx affected --target=typecheck-code,lint-code,format-code,deprecate-code,guard-code --configuration=check --parallel=${String(ANALYSIS_PARALLELISM)} --outputStyle=static ${getStagedRevisionFlags(files)}`,
    "pnpm exec nx run-many --targets=conformetry-validate --outputStyle=static",
  ],
};

export default config;
