import { Inject, Injectable } from "@nestjs/common";

import { CrossCountCharacteristicService } from "../../submatrix/cross/cross-count-characteristic.service";

import { IsMeshCharacteristicService } from "./is-mesh-characteristic.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Whether a Code's repeating unit crosses itself — at least one point
 * leaves by all four arms — without being the full mesh, whose interior
 * is nothing but crosses.
 */
@Injectable()
export class IsCrossCharacteristicService implements CharacteristicEvaluator<boolean> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CrossCountCharacteristicService)
    private readonly crossCountService: CrossCountCharacteristicService,
    @Inject(IsMeshCharacteristicService)
    private readonly isMeshService: IsMeshCharacteristicService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `isCross` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<boolean> = {
    category: "compound",
    description:
      "Whether the repeating unit has at least one cross point and is not a mesh.",
    formula: String.raw`n_{\text{cross}} > 0 \wedge \neg\,\text{isMesh}`,
    key: "isCross",
    name: "Is Cross",
    valueType: "boolean",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Checks the unit has a cross and is not the mesh template. */
  public compute(context: CharacteristicContext): boolean {
    return (
      this.crossCountService.compute(context) > 0 &&
      !this.isMeshService.compute(context)
    );
  }
}
