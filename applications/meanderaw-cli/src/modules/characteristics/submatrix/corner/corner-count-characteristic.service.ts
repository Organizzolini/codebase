import { Inject, Injectable } from "@nestjs/common";

import { NorthEastCornerCountCharacteristicService } from "./north-east-corner-count-characteristic.service";
import { NorthWestCornerCountCharacteristicService } from "./north-west-corner-count-characteristic.service";
import { SouthEastCornerCountCharacteristicService } from "./south-east-corner-count-characteristic.service";
import { SouthWestCornerCountCharacteristicService } from "./south-west-corner-count-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts every corner of a Code — points whose ink turns through two
 * perpendicular arms and leaves by no other — as the sum of the four
 * directional corner characteristics it injects, rather than by scanning
 * the grid itself.
 */
@Injectable()
export class CornerCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(NorthEastCornerCountCharacteristicService)
    private readonly northEastCornerCountService: NorthEastCornerCountCharacteristicService,
    @Inject(NorthWestCornerCountCharacteristicService)
    private readonly northWestCornerCountService: NorthWestCornerCountCharacteristicService,
    @Inject(SouthEastCornerCountCharacteristicService)
    private readonly southEastCornerCountService: SouthEastCornerCountCharacteristicService,
    @Inject(SouthWestCornerCountCharacteristicService)
    private readonly southWestCornerCountService: SouthWestCornerCountCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `cornerCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of corner points — ink turning through exactly two perpendicular arms — in any of the four orientations.",
    formula: String.raw`n_{\text{NE}} + n_{\text{NW}} + n_{\text{SE}} + n_{\text{SW}}`,
    key: "cornerCount",
    name: "Corner Count",
    submatrix: { columns: 1, rows: 1 },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Sums the four directional corner counts over the same context. */
  public compute(context: CharacteristicContext): number {
    return (
      this.northEastCornerCountService.compute(context) +
      this.northWestCornerCountService.compute(context) +
      this.southEastCornerCountService.compute(context) +
      this.southWestCornerCountService.compute(context)
    );
  }
}
