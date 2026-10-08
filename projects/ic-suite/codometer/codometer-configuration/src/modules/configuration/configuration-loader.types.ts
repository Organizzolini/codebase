// 🏷️ Types

/** What `ConfigurationLoaderService.load` found, unvalidated. */
export interface LoadedConfigurationModule {
  configuration: unknown;
  /**
   * Absolute path of the file it came from.
   *
   * Carried because a caller listing what a repository configures has to say
   * where each answer was written, and the upward walk is the only thing that
   * knows: by the time a configuration is resolved, the file it came from is
   * indistinguishable from one three directories higher.
   */
  path: string;
}
