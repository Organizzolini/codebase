import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/** Longest a skill name may be, per the repository's skill-authoring rules. */
const MAXIMUM_NAME_LENGTH = 64;

/** Longest a skill description may be, per the same rules. */
const MAXIMUM_DESCRIPTION_LENGTH = 1024;

/** Longest a SKILL.md body may be, per the same rules. */
const MAXIMUM_BODY_LINES = 500;

/** Matches the front matter block and captures its contents. */
const FRONT_MATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/u;

/** Matches every inline and reference-style markdown link target. */
const LINK_PATTERN = /\]\(([^)\s]+)\)/gu;

const skillsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "skills",
);

/** Narrows parsed front matter without asserting its shape. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** One shipped skill, as it will exist once installed. */
interface ShippedSkill {
  body: string;
  description: unknown;
  directory: string;
  name: unknown;
}

/**
 * Reads every skill this package ships.
 *
 * The directory is read rather than a list being maintained, so a skill added
 * without a test is impossible.
 */
const readShippedSkills = (): ShippedSkill[] => {
  const entries = fs
    .readdirSync(skillsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  return entries.map((entry) => {
    const contents = fs.readFileSync(
      path.join(skillsDirectory, entry.name, "SKILL.md"),
      "utf8",
    );
    const matched = FRONT_MATTER_PATTERN.exec(contents);
    const frontMatter: unknown =
      matched?.[1] === undefined ? {} : parse(matched[1]);
    const fields: Record<string, unknown> = isRecord(frontMatter)
      ? frontMatter
      : {};

    return {
      body: contents.replace(FRONT_MATTER_PATTERN, ""),
      description: fields["description"],
      directory: entry.name,
      name: fields["name"],
    };
  });
};

const shippedSkills = readShippedSkills();

/**
 * Checks the properties that decide whether an installed skill works at all.
 *
 * The front matter assertions matter most: the skills tool silently skips any
 * skill missing a name or a description, so a malformed skill fails by simply
 * not existing, reporting nothing anywhere.
 */
describe("shipped skills", () => {
  it("ships at least one skill", () => {
    expect(shippedSkills).not.toHaveLength(0);
  });

  describe.each(shippedSkills)("$directory", (skill: ShippedSkill) => {
    it("declares a name and a description", () => {
      expect(skill.name).toBeTypeOf("string");
      expect(skill.description).toBeTypeOf("string");
      expect(skill.name).not.toBe("");
      expect(skill.description).not.toBe("");
    });

    it("declares a name matching its directory", () => {
      expect(skill.name).toBe(skill.directory);
    });

    it("keeps its name and description within the documented caps", () => {
      expect(String(skill.name).length).toBeLessThanOrEqual(
        MAXIMUM_NAME_LENGTH,
      );
      expect(String(skill.description).length).toBeLessThanOrEqual(
        MAXIMUM_DESCRIPTION_LENGTH,
      );
    });

    it("keeps its body within the documented cap", () => {
      expect(skill.body.split("\n").length).toBeLessThanOrEqual(
        MAXIMUM_BODY_LINES,
      );
    });

    // An installed skill is a copied directory with no manifest and nothing
    // beside it, so a link that leaves the skill cannot resolve for a consumer
    // even though it resolves here.
    it("links only to files inside its own directory", () => {
      const root = path.join(skillsDirectory, skill.directory);
      const targets = [...skill.body.matchAll(LINK_PATTERN)]
        .map(([, target]) => target ?? "")
        .filter(
          (target) => !target.startsWith("http") && !target.startsWith("#"),
        );

      for (const target of targets) {
        const [relativePath = ""] = target.split("#");
        const resolved = path.resolve(root, relativePath);

        expect(
          path.relative(root, resolved).startsWith(".."),
          `${target} escapes the skill directory`,
        ).toBe(false);
        expect(fs.existsSync(resolved), `${target} does not exist`).toBe(true);
      }
    });
  });
});
