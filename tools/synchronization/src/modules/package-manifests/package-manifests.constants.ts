import { z } from "zod";

// ♟️ Constants

/** The relative path to the root package.json file. */
export const ROOT_PACKAGE_JSON_PATH = "package.json";

/** GitHub repository owner and repository name. */
export const GITHUB_REPOSITORY_OWNER = "organizzolini";
export const GITHUB_REPOSITORY_NAME = "codebase";
export const GITHUB_REPOSITORY = `${GITHUB_REPOSITORY_OWNER}/${GITHUB_REPOSITORY_NAME}`;

/** Repository git URL for package manifests. */
export const REPOSITORY_URL = `git+https://github.com/${GITHUB_REPOSITORY}.git`;

/** Issue tracker URL for package manifests. */
export const BUGS_URL = `https://github.com/${GITHUB_REPOSITORY}/issues`;

/** Base GitHub tree URL for generating package homepages. */
export const GITHUB_TREE_BASE_URL = `https://github.com/${GITHUB_REPOSITORY}/tree/main`;

/** Schema for validating the workspace root package.json. */
export const ROOT_PACKAGE_JSON_SCHEMA = z.object({
  author: z.string().min(1),
  license: z.string().min(1),
  repository: z.string().min(1),
});

/** Schema for validating individual package.json manifests for publishable packages. */
export const PACKAGE_MANIFEST_SCHEMA = z.looseObject({
  author: z.string().min(1).optional(),
  bugs: z.object({ url: z.string().min(1) }).optional(),
  description: z.string().optional(),
  homepage: z.string().min(1).optional(),
  keywords: z.array(z.string()).optional(),
  license: z.string().min(1).optional(),
  name: z.string().min(1),
  repository: z
    .object({
      directory: z.string().min(1),
      type: z.string().min(1),
      url: z.string().min(1),
    })
    .optional(),
  version: z.string().min(1),
});

/** The complete list of 28 publishable package directories across the four IC suites. */
export const PUBLISHABLE_PACKAGE_PROJECTS = [
  // Conformetry (8)
  "packages/ic-suite/conformetry/conformetry-cli",
  "packages/ic-suite/conformetry/conformetry-configuration",
  "packages/ic-suite/conformetry/conformetry-core",
  "packages/ic-suite/conformetry/conformetry-generation",
  "packages/ic-suite/conformetry/conformetry-languages",
  "packages/ic-suite/conformetry/conformetry-nx",
  "packages/ic-suite/conformetry/conformetry-output",
  "packages/ic-suite/conformetry/conformetry-validation",

  // Codometer (6)
  "packages/ic-suite/codometer/codometer-cli",
  "packages/ic-suite/codometer/codometer-configuration",
  "packages/ic-suite/codometer/codometer-core",
  "packages/ic-suite/codometer/codometer-languages",
  "packages/ic-suite/codometer/codometer-measurement",
  "packages/ic-suite/codometer/codometer-output",

  // Callidescope (6)
  "packages/ic-suite/callidescope/callidescope-cli",
  "packages/ic-suite/callidescope/callidescope-configuration",
  "packages/ic-suite/callidescope/callidescope-core",
  "packages/ic-suite/callidescope/callidescope-graph",
  "packages/ic-suite/callidescope/callidescope-nx",
  "packages/ic-suite/callidescope/callidescope-output",

  // Codependix (8)
  "packages/ic-suite/codependix/codependix-boundaries",
  "packages/ic-suite/codependix/codependix-cli",
  "packages/ic-suite/codependix/codependix-configuration",
  "packages/ic-suite/codependix/codependix-core",
  "packages/ic-suite/codependix/codependix-file-imports",
  "packages/ic-suite/codependix/codependix-nestjs-modules",
  "packages/ic-suite/codependix/codependix-nx-projects",
  "packages/ic-suite/codependix/codependix-output",
] as const;
