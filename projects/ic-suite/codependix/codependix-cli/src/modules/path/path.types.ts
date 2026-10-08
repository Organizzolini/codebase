// 🏷️ Types

/** Command-line options `codependix path` accepts. */
export interface PathCommandOptions {
  config?: string | undefined;
  directory?: string | undefined;
  exclude?: string[] | undefined;
  fileImports?: boolean | undefined;
  format?: string | undefined;
  include?: string[] | undefined;
  nestjsModules?: boolean | undefined;
  nxProjects?: boolean | undefined;
  projects?: string | undefined;
  tags?: string | undefined;
}
