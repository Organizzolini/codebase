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
  "projects/ic-suite/conformetry/conformetry-cli",
  "projects/ic-suite/conformetry/conformetry-configuration",
  "projects/ic-suite/conformetry/conformetry-core",
  "projects/ic-suite/conformetry/conformetry-generation",
  "projects/ic-suite/conformetry/conformetry-languages",
  "projects/ic-suite/conformetry/conformetry-nx",
  "projects/ic-suite/conformetry/conformetry-output",
  "projects/ic-suite/conformetry/conformetry-validation",

  // Codometer (6)
  "projects/ic-suite/codometer/codometer-cli",
  "projects/ic-suite/codometer/codometer-configuration",
  "projects/ic-suite/codometer/codometer-core",
  "projects/ic-suite/codometer/codometer-languages",
  "projects/ic-suite/codometer/codometer-measurement",
  "projects/ic-suite/codometer/codometer-output",

  // Callidescope (6)
  "projects/ic-suite/callidescope/callidescope-cli",
  "projects/ic-suite/callidescope/callidescope-configuration",
  "projects/ic-suite/callidescope/callidescope-core",
  "projects/ic-suite/callidescope/callidescope-graph",
  "projects/ic-suite/callidescope/callidescope-nx",
  "projects/ic-suite/callidescope/callidescope-output",

  // Codependix (8)
  "projects/ic-suite/codependix/codependix-boundaries",
  "projects/ic-suite/codependix/codependix-cli",
  "projects/ic-suite/codependix/codependix-configuration",
  "projects/ic-suite/codependix/codependix-core",
  "projects/ic-suite/codependix/codependix-file-imports",
  "projects/ic-suite/codependix/codependix-nestjs-modules",
  "projects/ic-suite/codependix/codependix-nx-projects",
  "projects/ic-suite/codependix/codependix-output",
] as const;
