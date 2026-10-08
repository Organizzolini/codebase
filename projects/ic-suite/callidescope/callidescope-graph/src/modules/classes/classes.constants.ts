// ♟️ Constants

/**
 * Concrete implementations one interface member may resolve to before the call
 * is recorded as unresolved instead.
 *
 * Not a limit on what a run judges — it is the threshold at which structural
 * interface resolution stops guessing. Where an interface member has no
 * nominal implementers, the type checker is asked which classes are assignable
 * to it, and a member named `run`, `emit`, or `sync` structurally matches
 * dozens of unrelated classes in a real workspace. Expanding all of them
 * manufactures call stacks no execution ever takes, so past the cap the whole
 * expansion is dropped rather than narrowed to a favorite.
 *
 * A constant rather than a configuration field. Removing it outright would
 * follow every candidate and move every depth measurement upward
 * unpredictably; making it configurable asks every project to hold an opinion
 * about a noise control none of them varies. Eight is the number every
 * configuration in this repository already used.
 */
export const MAXIMUM_IMPLEMENTATION_CANDIDATES = 8;
