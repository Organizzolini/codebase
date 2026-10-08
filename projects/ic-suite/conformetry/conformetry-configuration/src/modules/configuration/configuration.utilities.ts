// 🛠️ Utilities

import path from "node:path";

import { ALL_TEMPLATES_SELECTION } from "../input/input.constants";

import type { z } from "zod";

/**
 * Fails when two generators would answer to the same thing.
 *
 * A host resolves a generator by taking the *first* whose name matches, so a
 * collision does not error where it is used — it silently shadows, and the
 * losing generator becomes unreachable while still appearing in the
 * configuration. Two generators sharing a template collide differently:
 * validation then finds instances that fit both equally and reports them as
 * matching nothing.
 *
 * Reported through Zod rather than thrown, so every collision in a
 * configuration surfaces in one pass and each one carries the index of the
 * entry it came from.
 *
 * A generator is described structurally rather than taken as
 * `ParsedGeneratorEntry`, which is inferred from the very schema these checks
 * are attached to: naming it would make the schema depend on this file and
 * this file on the schema.
 */
export function assertNoCollisions(
  definitions: {
    readonly name: string;
    readonly templatePath: string;
  }[],
  context: z.RefinementCtx,
): void {
  const issues = [
    ...findDuplicates({
      definitions,
      describe: (key, owners) =>
        `"${key}" is the name of more than one generator: ${owners.join(", ")}. A host resolves the first match, leaving the others unreachable.`,
      keysOf: (definition) => [definition.name],
    }),
    ...findDuplicates({
      definitions,
      describe: (key, owners) =>
        `${key} is the template of more than one generator: ${owners.join(", ")}. Validation cannot tell which one a matching instance belongs to.`,
      keysOf: (definition) => [definition.templatePath],
    }),
    ...findUnusableNames(definitions),
    ...findReservedNames(definitions),
  ];

  for (const issue of issues) {
    context.addIssue({
      code: "custom",
      message: issue.message,
      path: issue.path,
    });
  }
}

/** Reports every key more than one generator claims. */
function findDuplicates<Definition extends { name: string }>(args: {
  definitions: Definition[];
  describe: (key: string, owners: string[]) => string;
  keysOf: (definition: Definition) => string[];
}): { message: string; path: (number | string)[] }[] {
  const ownersByKey = new Map<string, { lastIndex: number; names: string[] }>();

  for (const [index, definition] of args.definitions.entries()) {
    for (const key of args.keysOf(definition)) {
      const owner = ownersByKey.get(key);

      ownersByKey.set(key, {
        // The later entry is the one to change: the first is what a host will
        // have resolved to all along.
        lastIndex: index,
        names: [...(owner?.names ?? []), definition.name],
      });
    }
  }

  return [...ownersByKey.entries()]
    .filter(([, owner]) => owner.names.length > 1)
    .map(([key, owner]) => ({
      message: args.describe(key, owner.names),
      path: [owner.lastIndex],
    }));
}

/**
 * Reports a name that would shadow the all-templates sentinel.
 *
 * `validate --templates all` means every template. A generator answering to
 * that name would make the same word mean two things on one command line, and
 * whichever meaning won would silently discard the other.
 */
function findReservedNames(
  definitions: {
    readonly name: string;
  }[],
): { message: string; path: (number | string)[] }[] {
  return definitions
    .map((definition, index) => ({ index, name: definition.name }))
    .filter(({ name }) => name === ALL_TEMPLATES_SELECTION)
    .map(({ index, name }) => ({
      message: `Generator "${name}" is named after a selection that is reserved: \`validate --templates all\` already means every template.`,
      path: [index],
    }));
}

/** Reports names that could not be addressed or emitted. */
function findUnusableNames(
  definitions: {
    readonly name: string;
  }[],
): { message: string; path: (number | string)[] }[] {
  return definitions
    .map((definition, index) => ({ index, name: definition.name }))
    .filter(({ name }) => name === "" || name !== path.basename(name))
    .map(({ index, name }) => ({
      message: `Generator "${name}" is addressed by its name and emitted to a file named after it, so that name cannot contain a path separator.`,
      path: [index],
    }));
}
