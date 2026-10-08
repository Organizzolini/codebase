import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { EastEdgeCountCharacteristicService } from "./east-edge-count-characteristic.service";
import { EdgeCountCharacteristicService } from "./edge-count-characteristic.service";
import { NorthEdgeCountCharacteristicService } from "./north-edge-count-characteristic.service";
import { PointCharacteristicsModule } from "./point-characteristics.module";
import { SouthEdgeCountCharacteristicService } from "./south-edge-count-characteristic.service";
import { WestEdgeCountCharacteristicService } from "./west-edge-count-characteristic.service";

import type { CharacteristicContext } from "../../characteristics.types";

/** Codes spanning single points of one to four arms, a closed rectangle, and a band with ink leaving its top border. */
const CODES = ["06x01y8cef70", "04x01y7430", "04x02y6335a339", "03x02y6b5a39"];

describe(PointCharacteristicsModule, () => {
  let contextService: CharacteristicContextService;
  let east: EastEdgeCountCharacteristicService;
  let edges: EdgeCountCharacteristicService;
  let north: NorthEdgeCountCharacteristicService;
  let south: SouthEdgeCountCharacteristicService;
  let west: WestEdgeCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule, PointCharacteristicsModule],
      providers: [CharacteristicContextService],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    east = module.get(EastEdgeCountCharacteristicService);
    edges = module.get(EdgeCountCharacteristicService);
    north = module.get(NorthEdgeCountCharacteristicService);
    south = module.get(SouthEdgeCountCharacteristicService);
    west = module.get(WestEdgeCountCharacteristicService);
  });

  /** The four directional edge counts of one context, north, south, east, then west. */
  function directional(context: CharacteristicContext): number[] {
    return [north, south, east, west].map((service) =>
      service.compute(context),
    );
  }

  it.each(CODES)(
    "counts every arm of %s once across the four directions, twice its edge count",
    (code) => {
      const context = contextService.create(code);
      const armSum = directional(context).reduce(
        (sum, count) => sum + count,
        0,
      );

      expect(armSum).toBe(2 * edges.compute(context));
    },
  );

  it("balances east and west arms when every horizontal arm is reciprocated", () => {
    const context = contextService.create("03x02y6b5a39");

    expect([east.compute(context), west.compute(context)]).toStrictEqual([
      4, 4,
    ]);
  });

  // Exact N=S holds for every Code that spells a well-formed tile, whose first
  // row carries no north, last row no south, and every south a north below;
  // only a Code that is not a tile, like the border case below, can break it.
  it("balances north and south arms when no ink leaves the band", () => {
    const [northCount, southCount] = directional(
      contextService.create("04x02y6335a339"),
    );

    expect([northCount, southCount]).toStrictEqual([2, 2]);
  });

  it("counts a north arm at the band's top border with no south arm to answer it", () => {
    const [northCount, southCount] = directional(
      contextService.create("03x02y6b5a39"),
    );

    expect([northCount, southCount]).toStrictEqual([3, 2]);
  });
});
