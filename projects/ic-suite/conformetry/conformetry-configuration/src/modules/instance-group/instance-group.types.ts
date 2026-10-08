// 🏷️ Types

/**
 * One set of instance globs and the substitutions their template renders with.
 *
 * Directory and file patterns behave differently on purpose — see
 * `Instance.path`.
 */
export interface ConformetryInstanceGroup {
  /**
   * Workspace-relative globs naming paths that are never instances, applied
   * whether or not the group has tags. A directory or file the patterns found
   * is dropped when one of these matches it — how vendored or generated code,
   * such as shadcn components, is left out of validation.
   */
  exclude?: string[] | undefined;
  /**
   * Globs locating this group's instances.
   *
   * Workspace-relative on their own. A host that resolves `tags` may instead
   * read them relative to each labelled host it selects — see
   * `ConformetryNxInstanceGroup` in `@conformetry/nx` — which is why a group
   * naming only tags is legal: it selects without locating.
   */
  patterns?: string[] | undefined;
  /**
   * Values every placeholder this generator's template uses must be given.
   * Mustache renders an unknown placeholder as empty, so a missing entry shows
   * up as a silent hole rather than an error.
   */
  substitutions?: Record<string, string> | undefined;
  /**
   * Labels selecting the hosts this group applies to.
   *
   * The base configuration carries them uninterpreted, because it has no
   * notion of a host to match them against; `conformetry-nx` reads them as Nx
   * project tags, and another host is free to read them as something else. A
   * group with no tags applies everywhere.
   */
  tags?: string[] | undefined;
  /**
   * Lowest conformance score the instances in this group may have, overriding
   * the generator's own threshold.
   *
   * This is what makes a migration bearable: one directory being brought onto
   * a new template can be held to a lower bar while every other instance of
   * the same template stays strict.
   */
  threshold?: number | undefined;
}
