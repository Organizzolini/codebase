import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { CodeService } from "../code/code.service";

import { DRAW_MINIMUM_ROWS } from "./enumeration.constants";
import { TileEnumerationService } from "./tile-enumeration.service";

import type { MeanderShape } from "../meanderaw-database/meanderaw-database.types";
import type { EnumeratedMeander, Environment } from "./enumeration.types";

/**
 * Enumerates the whole lattice's unit space — every structurally distinct
 * repeat the edge budget admits, at every shape it admits one at — and
 * spells each one as a Code.
 *
 * **There is one unit space, not ten.** That is spec #813's own
 * Implementation Decision, and it is why this service writes no new walk.
 * `TileEnumerationService` already decides each of a repeat's edges in turn,
 * `2 ** edges` wide, folded by `SymmetryService`'s group so that a
 * shift or a mirror of one repeat is not another — and nothing in that walk
 * is about `mosaic`. It lives in that family's module because `mosaic` was
 * the only family whose corpus was drawn this way, not because the
 * enumeration knows what a `mosaic` is; its own doc comment says so
 * outright: "Nothing here knows what a tile is called." So the
 * generalization this ticket asks for is not nine more enumerators. It is
 * running the one that exists across the whole row range the budget reaches,
 * and deciding family membership afterwards, by its own structure
 * rather than by which generator drew
 * something.
 *
 * **The budget is the lattice's, not the family's.**
 * `EDGE_BUDGET` is read through `TileEnumerationService` rather than
 * restated here, so the workspace holds one budget rather than two that
 * could disagree about the same space. A repeat of `rows` by `columns` holds
 * `columns × (2 × rows - 1)` edges and the walk is `2 ** edges` wide, so the
 * budget is what keeps the space a size somebody chose rather than one
 * somebody discovers. At twenty-four it admits twenty-five shapes and
 * 7,059,159 distinct meanders — of which the 8,551 in the eleven shapes the
 * `mosaic` half of the corpus already commits are reproduced rather than
 * recomputed differently.
 *
 * **No family filter is applied anywhere in here**, which is the point:
 * every repeat within budget is produced, and a repeat that satisfies no
 * family's combination is still a meander with a Code, recorded with a null
 * family. Enumerating a family's own members would need the definitions to
 * exist first, and the definitions are read off the enumeration.
 */
@Injectable()
export class EnumerationService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(TileEnumerationService)
    private readonly tileEnumerationService: TileEnumerationService,
    @Inject(ConfigService)
    configService: ConfigService<Environment>,
  ) {
    this.maximumColumns =
      configService.get<number>("DRAW_MAXIMUM_COLUMNS") ??
      Number.MAX_SAFE_INTEGER;
    this.maximumRows =
      configService.get<number>("DRAW_MAXIMUM_ROWS") ?? Number.MAX_SAFE_INTEGER;
  }

  // 🔐 Private Fields

  /**
   * The widest column count the draw run draws, read once from
   * `DRAW_MAXIMUM_COLUMNS` at construction and layered on top of the edge
   * budget as a review filter rather than replacing it.
   */
  private readonly maximumColumns: number;

  /**
   * The deepest row count the draw run draws, read once from
   * `DRAW_MAXIMUM_ROWS` at construction and layered on top of the edge
   * budget as a review filter rather than replacing it.
   */
  private readonly maximumRows: number;

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Every structurally distinct meander of one shape, one per symmetry
   * class, each spelled by the Code of the class's own canonical
   * representative.
   *
   * A shape the budget does not admit is refused rather than enumerated
   * slowly, by the walk itself: `2 ** edges` wide means one shape too many
   * is not a long run but an unfinished one.
   */
  enumerate(shape: MeanderShape): EnumeratedMeander[] {
    const { columns, rows } = shape;

    return this.tileEnumerationService.enumerate(rows, columns).map((tile) => ({
      code: this.codeService.spell(tile),
      columns,
      rows,
    }));
  }

  /** Whether the budget admits a shape, which is the only thing that decides whether the draw run walks it. */
  isAdmitted(shape: MeanderShape): boolean {
    return this.tileEnumerationService.isAdmitted(shape);
  }

  /**
   * Every shape the draw run covers, shallowest first and narrowest first
   * within a row count.
   *
   * Both ends are the budget's rather than a table's, by default. The draw run
   * starts at {@link DRAW_MINIMUM_ROWS} and climbs while a single-column
   * repeat is still admitted, which stops it at twelve rows unconfigured;
   * the column span at each row count is however many the budget leaves,
   * which is eight at two rows and one from seven rows down.
   * `DRAW_MAXIMUM_ROWS` and `DRAW_MAXIMUM_COLUMNS` layer a further review
   * filter on top of those two ends — never past them, since a shape past
   * the budget is still refused — and default to unbounded, so an
   * unconfigured draw run is
   * exactly this. A family's own row range is not consulted here and could
   * not be: enumeration applies no per-family filter, and a repeat is drawn
   * because it fits, not because some family was expecting it.
   */
  shapes(): MeanderShape[] {
    const shapes: MeanderShape[] = [];

    for (
      let rows = DRAW_MINIMUM_ROWS;
      rows <= this.maximumRows && this.isAdmitted({ columns: 1, rows });
      rows += 1
    ) {
      const widest = Math.min(
        this.tileEnumerationService.maximumColumns(rows),
        this.maximumColumns,
      );

      for (let columns = 1; columns <= widest; columns += 1) {
        shapes.push({ columns, rows });
      }
    }

    return shapes;
  }
}
