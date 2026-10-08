// ♟️ Constants

/** Paths where GitHub CODEOWNERS files are supported. */
export const CODEOWNERS_FILE_PATHS = [
  ".github/CODEOWNERS",
  "CODEOWNERS",
  "docs/CODEOWNERS",
] as const;

/** Valid GitHub username (\@user), team handle (\@org/team), or email address. */
export const CODEOWNERS_HANDLE_PATTERN =
  /^(@[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/u;

/** Directory holding GitHub Actions workflow definitions. */
export const WORKFLOWS_DIRECTORY = ".github/workflows";

/** Maximum permitted workflow job timeout in minutes (GitHub maximum is 360). */
export const MAX_WORKFLOW_TIMEOUT_MINUTES = 360;
