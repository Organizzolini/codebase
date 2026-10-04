import { Inject, Injectable } from "@nestjs/common";

import { CharacteristicsService } from "../characteristics/characteristics.service";
import { ClassificationService } from "../classification/classification.service";
import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { SWEEP_MINIMUM_ROWS } from "../enumeration/enumeration.constants";
import { EnumerationService } from "../enumeration/enumeration.service";

import { CORPUS_FAMILIES, DuplicateCorpusCodeError } from "./corpus.constants";

import type { Meander } from "../database/entities/Meander.entity";
import type { CorpusEntry, CorpusFamily } from "./corpus.types";

/**
 * Ingests the historical corpus into the meander database, through
 * the same generic reader and Characteristic computation
 * `DrawCodeService` draws a `--code` meander through — so an Enumerated row
 * and a Hardcoded row are produced by the exact same pipeline, and only ever
 * differ in where their Code came from.
 *
 * **Which entries it ingests is computed, not listed.** A meander the sweep
 * already reaches is reproduced by `EnumerationService` rather than
 * preserved, so only the entries beyond that reach are ingested — and the
 * reach is two bounds rather than one. `EnumerationService.isAdmitted` is
 * the edge budget, which is what makes enumeration possible at all; and
 * `SWEEP_MINIMUM_ROWS` is the floor the sweep starts at, because a
 * single-row band's interior is a single row with no southward edge anywhere
 * in it. An entry is kept when either bound puts it outside, which is what
 * lets `parallel`'s five single-row entries stay in the corpus while sitting
 * comfortably inside the budget. Nothing hand-lists the split, so raising
 * the budget moves the boundary here rather than leaving a stale list behind.
 *
 * **A Hardcoded entry's family is provenance, not a verdict.** The
 * `family` column records the first `output/<family>/` directory the
 * retired file tree filed that Code under, and the tree is known to be wrong
 * in places — see
 * `docs/adr/0013-hold-the-historical-corpus-as-a-test-set.md`. Ingesting
 * family by family in `CORPUS_FAMILIES` order is that same tree order, kept
 * so the local database's own row order is a fact about the tree rather
 * than about whatever order a constant happens to be written in.
 *
 * A sub-family, by contrast, is **named rather than carried**:
 * `SubFamilyService` reads the tile the Code draws, exactly as it does for
 * an Enumerated row, so nothing derived is stored in the corpus alongside
 * what was extracted.
 *
 * The stored Characteristics are `DrawRecordService`'s: every one of
 * `CharacteristicsService.compute` that is nonzero or true, in the one
 * `characteristics` map, with `isReducible` when the filed Code is wider
 * than its unit.
 *
 * A Code that collides with one already committed — an Enumerated row, or
 * another entry ingested earlier in the same sweep — fails loudly through
 * {@link DuplicateCorpusCodeError} rather than silently overwriting, since
 * `DatabaseService.save` relies on the `code` column's own unique constraint
 * rather than checking beforehand.
 */
@Injectable()
export class CorpusService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CharacteristicsService)
    private readonly characteristicsService: CharacteristicsService,
    @Inject(ClassificationService)
    private readonly classificationService: ClassificationService,
    @Inject(DatabaseService)
    private readonly databaseService: DatabaseService,
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(EnumerationService)
    private readonly enumerationService: EnumerationService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads, measures, names, and persists one entry under the family it was filed as. */
  private async ingestOne(
    family: CorpusFamily,
    entry: CorpusEntry,
  ): Promise<Meander> {
    const { code, columns, rows } = entry;
    const parsed = this.codeService.parse(code, rows, columns);
    const canonical = this.codeService.canonicalPhase(parsed, (phase) =>
      this.characteristicsService.tileCrossingComponentDeltaCount(phase),
    );

    const characteristics = this.characteristicsService.compute(canonical);
    const isReducible = this.characteristicsService.isReducible(canonical);
    const formatted = this.codeService.format(canonical);

    try {
      const existing = await this.databaseService.findOneByCode(formatted);
      if (existing) {
        return existing;
      }

      const filedFamily = entry.filedUnder[0];
      const entityFamily =
        filedFamily === "negative"
          ? "unclassified"
          : filedFamily === "branch"
            ? this.classificationService.classify(characteristics, {
                isReducible,
                rows,
              })
            : filedFamily;

      return await this.databaseService.save({
        characteristics: this.characteristicsService.stored(
          characteristics,
          isReducible,
        ),
        code: formatted,
        columns,
        family: entityFamily,
        isHardcoded: true,
        lattice: canonical.digits,
        repeats: canonical.repeats,
        rows,
        symmetricalCodes: this.codeService.symmetricalCodes(
          canonical,
          (phase) =>
            this.characteristicsService.tileCrossingComponentDeltaCount(phase),
        ),
      });
    } catch (error) {
      throw new DuplicateCorpusCodeError(formatted, family, error);
    }
  }

  // 🌎 Public Methods

  /**
   * Ingests every entry of `corpus` that {@link isBeyondEnumeration} keeps,
   * family by family in `CORPUS_FAMILIES` order and in the corpus's own
   * order within a family, resolving with every row saved.
   *
   * Ingestion is sequential rather than run in parallel across entries: a
   * failure has to name the one entry that caused it, which a `Promise.all`
   * racing every `save` at once cannot promise, since concurrent writes
   * would reach the database in whatever order their connections won.
   */
  async ingest(corpus: readonly CorpusEntry[]): Promise<Meander[]> {
    const beyond = corpus.filter((entry) => this.isBeyondEnumeration(entry));
    const saved: Meander[] = [];

    for (const family of CORPUS_FAMILIES) {
      for (const entry of beyond) {
        if (entry.filedUnder[0] === family) {
          saved.push(await this.ingestOne(family, entry));
        }
      }
    }

    return saved;
  }

  /**
   * Whether an entry lies beyond what the sweep enumerates, and so has to be
   * preserved rather than rediscovered.
   *
   * Both bounds are asked rather than restated: the edge budget through
   * `EnumerationService`, and the sweep's own row floor. A shape outside
   * either one is outside the sweep.
   */
  isBeyondEnumeration(entry: CorpusEntry): boolean {
    const { columns, rows } = entry;

    return (
      rows < SWEEP_MINIMUM_ROWS ||
      !this.enumerationService.isAdmitted({ columns, rows })
    );
  }
}
