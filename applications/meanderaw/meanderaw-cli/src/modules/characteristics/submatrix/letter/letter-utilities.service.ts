import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { LETTER_ORIENTATION_NAMES, LETTER_SCRIPTS } from "./letter.constants";

import type { Matrix } from "../../../matrix/matrix.types";
import type {
  CharacteristicContext,
  CharacteristicEvaluator,
} from "../../characteristics.types";
import type {
  LetterCorner,
  LetterDefinition,
  LetterFlip,
  LetterOrientation,
  LetterOrientationName,
  LetterRotation,
  LetterScript,
  LetterTurn,
} from "./letter.types";

/**
 * The orientation arithmetic every letter shares: flipping a glyph template
 * either way, turning it clockwise, naming the sixteen corner and rotation
 * orientations, and reading each script's base corner. A letter holds one
 * base template and asks `evaluators` for an evaluator per orientation, each
 * counting the template `orientations` draws that way; an Arabic letter
 * holds one per positional form and asks `formEvaluators` instead.
 *
 * Counts are shared: within one context, every orientation, and every letter,
 * drawing the same template scans the matrix for it once.
 */
@Injectable()
export class LetterUtilitiesService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {}

  // 🔐 Private Fields

  /**
   * Each matrix's glyph counts by template, so orientations and letters
   * drawing the same ink scan a context once between them. Keyed weakly by
   * the context's matrix, so a count lives no longer than its context.
   */
  private readonly counts = new WeakMap<Matrix, Map<string, number>>();

  /** How many clockwise quarter turns each rotation makes. */
  private readonly quarterTurns: Readonly<Record<LetterRotation, number>> = {
    Half: 2,
    None: 0,
    Quarter: 1,
    ThreeQuarter: 3,
  };

  /** How each turn is said in an orientation's description. */
  private readonly turnWords: Readonly<
    Record<Exclude<LetterRotation, "None">, string>
  > = {
    Half: "turned a half turn",
    Quarter: "turned a quarter clockwise",
    ThreeQuarter: "turned three quarters clockwise",
  };

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** A template row's points, one character each — every template character is ASCII. */
  private characters(line: string): string[] {
    return Array.from({ length: line.length }, (_unused, column) =>
      line.charAt(column),
    );
  }

  /**
   * The count of `template` glyphs in a context, scanned the first time any
   * evaluator asks for it. `ink` is the template's rows joined by `/`, which
   * its evaluator spells once rather than on every context.
   */
  private count(
    context: CharacteristicContext,
    template: readonly string[],
    ink: string,
  ): number {
    const counts = this.counts.get(context.matrix) ?? this.track(context);
    const cached = counts.get(ink);
    if (cached !== undefined) {
      return cached;
    }

    const count = this.submatrixUtilitiesService.countIsolatedGlyphs(
      context.matrix,
      template,
    );
    counts.set(ink, count);
    return count;
  }

  /**
   * The sentence describing one orientation: the glyph, its upright shape,
   * how the orientation draws it, and every alias given for an orientation
   * drawing the same ink.
   */
  private description(
    definition: LetterDefinition,
    orientation: LetterOrientation,
    aliases: readonly string[],
  ): string {
    const aliasSentence =
      aliases.length === 0 ? "" : ` Also reads as ${aliases.join(", ")}.`;

    return `The number of minimal isolated ${definition.glyph} glyphs — ${definition.shape} — ${this.drawing(orientation)}.${aliasSentence}`;
  }

  /** A key spelled out word by word for display: `aSoutheastQuarterLatinCount` reads `A Southeast Quarter Latin Count`. */
  private displayName(key: string): string {
    const words = key.replaceAll(/(?=[A-Z])/gu, " ");

    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  /** How an orientation draws the upright glyph: `drawn upright`, or its flips and then its turn. */
  private drawing(orientation: LetterOrientation): string {
    const steps = [
      ...(orientation.flips.length === 0
        ? []
        : [`mirrored ${orientation.flips.join(" and ")}`]),
      ...(orientation.rotation === "None"
        ? []
        : [this.turnWords[orientation.rotation]]),
    ];

    return steps.length === 0 ? "drawn upright" : steps.join(", then ");
  }

  /** One orientation's evaluator: its own key, name, description, formula, and window, counting its own template. */
  private evaluator(
    definition: LetterDefinition,
    orientation: LetterOrientation,
    aliases: readonly string[],
  ): CharacteristicEvaluator<number> {
    const key = definition.key(orientation.name);
    const ink = orientation.template.join("/");

    return {
      compute: (context) => this.count(context, orientation.template, ink),
      metadata: {
        category: "submatrix",
        description: this.description(definition, orientation, aliases),
        formula: this.submatrixUtilitiesService.glyphFormula(
          orientation.template,
        ),
        key,
        name: this.displayName(key),
        submatrix: orientation.window,
        valueType: "number",
      },
    };
  }

  /**
   * The flips drawing a glyph at `corner` from its script's base corner:
   * east to west wherever the two differ east–west, then north to south
   * wherever they differ north–south.
   */
  private flips(corner: LetterCorner, base: LetterCorner): LetterFlip[] {
    return [
      ...(corner.endsWith("east") === base.endsWith("east")
        ? []
        : ["east to west" as const]),
      ...(corner.startsWith("North") === base.startsWith("North")
        ? []
        : ["north to south" as const]),
    ];
  }

  /** Whether an orientation name's suffix after its corner is a turn word. */
  private isTurn(suffix: string): suffix is LetterTurn {
    return Object.hasOwn(this.turnWords, suffix);
  }

  /**
   * Rewrites a template digit's arms through `arms`, which maps each arm bit
   * — north 8, south 4, east 2, west 1 — to the bit it becomes. A blank `.`
   * stays blank.
   */
  private mapArms(
    character: string,
    arms: Readonly<Record<number, number>>,
  ): string {
    if (character === ".") {
      return ".";
    }

    const digit = Number.parseInt(character, 16);
    return [8, 4, 2, 1]
      .filter((arm) => (digit & arm) !== 0)
      .reduce((sum, arm) => sum + (arms[arm] ?? 0), 0)
      .toString(16);
  }

  /** A base template facing `base` drawn in the orientation `name`: flipped to its corner, then turned. */
  private orientation(
    template: readonly string[],
    base: LetterCorner,
    name: LetterOrientationName,
  ): LetterOrientation {
    const { corner, rotation } = this.parse(name);
    const flips = this.flips(corner, base);
    const flipped = flips.reduce<readonly string[]>(
      (drawn, flip) =>
        flip === "east to west"
          ? this.flipHorizontally(drawn)
          : this.flipVertically(drawn),
      template,
    );
    const turned = this.turnClockwise(flipped, rotation);
    return {
      corner,
      flips,
      name,
      rotation,
      template: turned,
      window: this.submatrixUtilitiesService.glyphWindow(turned),
    };
  }

  /** An orientation name read back into its corner and its rotation. */
  private parse(name: LetterOrientationName): {
    corner: LetterCorner;
    rotation: LetterRotation;
  } {
    const corner: LetterCorner = `${name.startsWith("North") ? "North" : "South"}${name.slice("North".length).startsWith("east") ? "east" : "west"}`;
    const suffix = name.slice(corner.length);

    return { corner, rotation: this.isTurn(suffix) ? suffix : "None" };
  }

  /** Pads every row of a template with blanks to its widest row. */
  private rectangular(template: readonly string[]): string[] {
    const width = Math.max(0, ...template.map((line) => line.length));
    return template.map((line) => line.padEnd(width, "."));
  }

  /** Starts a context's glyph count cache, the first time any evaluator asks it for a count. */
  private track(context: CharacteristicContext): Map<string, number> {
    const counts = new Map<string, number>();
    this.counts.set(context.matrix, counts);
    return counts;
  }

  /**
   * Turns a template one quarter clockwise: its west column becomes its top
   * row, and each arm moves round — north to east, east to south, south to
   * west, west to north.
   */
  private turnQuarter(template: readonly string[]): string[] {
    const rows = this.rectangular(template);
    const width = rows[0]?.length ?? 0;
    return Array.from({ length: width }, (_unused, column) =>
      rows
        .map((line) =>
          this.mapArms(line.charAt(column), { 1: 8, 2: 4, 4: 1, 8: 2 }),
        )
        .toReversed()
        .join(""),
    );
  }

  // 🌎 Public Methods

  /** The corner a script's glyphs face before any flip: its reading direction. */
  public baseCorner(script: LetterScript): LetterCorner {
    return LETTER_SCRIPTS[script].baseCorner;
  }

  /**
   * A letter's sixteen evaluators, one per orientation in
   * {@link LetterUtilitiesService.orientationNames} order. Each has its own
   * key, display name, description, formula, and window, and counts the template its orientation draws. Orientations drawing the
   * same ink count it alike, and share every alias given for any of them.
   */
  public evaluators(
    definition: LetterDefinition,
  ): readonly CharacteristicEvaluator<number>[] {
    const orientations = this.orientations(
      definition.template,
      definition.script,
    );
    const aliasesByInk = new Map<string, string[]>();
    for (const { name, template } of orientations) {
      const alias = definition.aliases?.[name];
      if (alias === undefined) continue;

      const ink = template.join("/");
      aliasesByInk.set(ink, [...(aliasesByInk.get(ink) ?? []), alias]);
    }

    return orientations.map((orientation) =>
      this.evaluator(
        definition,
        orientation,
        aliasesByInk.get(orientation.template.join("/")) ?? [],
      ),
    );
  }

  /**
   * Mirrors a template east to west, swapping its east and west arms. Rows
   * come back padded with blanks to the widest row.
   */
  public flipHorizontally(template: readonly string[]): readonly string[] {
    return this.rectangular(template).map((line) =>
      this.characters(line)
        .toReversed()
        .map((character) => this.mapArms(character, { 1: 2, 2: 1, 4: 4, 8: 8 }))
        .join(""),
    );
  }

  /**
   * Mirrors a template north to south, swapping its north and south arms.
   * Rows come back padded with blanks to the widest row.
   */
  public flipVertically(template: readonly string[]): readonly string[] {
    return this.rectangular(template)
      .toReversed()
      .map((line) =>
        this.characters(line)
          .map((character) =>
            this.mapArms(character, { 1: 1, 2: 2, 4: 8, 8: 4 }),
          )
          .join(""),
      );
  }

  /**
   * The evaluators of a letter drawn as several base templates — an Arabic
   * letter's positional forms — each form's sixteen in turn, in the order
   * given. Each form is keyed, described, and aliased as
   * {@link LetterUtilitiesService.evaluators} builds it alone, so an alias
   * stays on its own form even where another form draws the same ink.
   */
  public formEvaluators(
    forms: readonly LetterDefinition[],
  ): readonly CharacteristicEvaluator<number>[] {
    return forms.flatMap((definition) => this.evaluators(definition));
  }

  /**
   * The sixteen orientation names, every corner with every rotation:
   * `Southeast`, `SoutheastQuarter`, `SoutheastHalf`, `SoutheastThreeQuarter`,
   * then the same for Southwest, Northeast, and Northwest — the order
   * {@link LETTER_ORIENTATION_NAMES} lists and every letter's keys follow.
   */
  public orientationNames(): readonly LetterOrientationName[] {
    return LETTER_ORIENTATION_NAMES;
  }

  /**
   * A base template drawn in all sixteen orientations, in
   * {@link LetterUtilitiesService.orientationNames} order. Each corner flips
   * the base wherever it differs from the script's base corner — east–west
   * by a horizontal flip, north–south by a vertical flip — and the rotation
   * then turns the flipped glyph clockwise. Each carries the window its
   * template fills, columns and rows swapping on a quarter turn, and the
   * flips it was drawn with, which its description then names.
   */
  public orientations(
    template: readonly string[],
    script: LetterScript,
  ): readonly LetterOrientation[] {
    const base = this.baseCorner(script);
    return LETTER_ORIENTATION_NAMES.map((name) =>
      this.orientation(template, base, name),
    );
  }

  /**
   * Turns a template clockwise by `rotation`, carrying each arm round with
   * it; a quarter or three-quarter turn swaps its columns and rows.
   */
  public turnClockwise(
    template: readonly string[],
    rotation: LetterRotation,
  ): readonly string[] {
    return Array.from({ length: this.quarterTurns[rotation] }).reduce<
      readonly string[]
    >((turned) => this.turnQuarter(turned), this.rectangular(template));
  }
}
