import { DiscoveryModule, DiscoveryService } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { CharacteristicsModule } from "../characteristics.module";

import { SubmatrixUtilitiesModule } from "./submatrix-utilities.module";
import { SubmatrixUtilitiesService } from "./submatrix-utilities.service";

/** The token a consumer module gathers the shared service under, through a factory whose `inject` list only resolves exported providers. */
const SHARED = Symbol("SHARED");

describe(SubmatrixUtilitiesModule, () => {
  it("exports SubmatrixUtilitiesService to a consumer that imports it", async () => {
    const module = await Test.createTestingModule({
      imports: [SubmatrixUtilitiesModule],
      providers: [
        {
          inject: [SubmatrixUtilitiesService],
          provide: SHARED,
          useFactory: (
            service: SubmatrixUtilitiesService,
          ): SubmatrixUtilitiesService => service,
        },
      ],
    }).compile();

    expect(module.get(SHARED)).toBeInstanceOf(SubmatrixUtilitiesService);
  });

  it("is the only provider of SubmatrixUtilitiesService across CharacteristicsModule", async () => {
    const module = await Test.createTestingModule({
      imports: [CharacteristicsModule, DiscoveryModule],
    }).compile();
    const providers: readonly { readonly instance: unknown }[] = module
      .get(DiscoveryService)
      .getProviders();

    expect(
      providers.filter(
        ({ instance }) => instance instanceof SubmatrixUtilitiesService,
      ),
    ).toHaveLength(1);
  });
});
