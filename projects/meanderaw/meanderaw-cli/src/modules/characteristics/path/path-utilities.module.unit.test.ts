import { DiscoveryModule, DiscoveryService } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { CharacteristicsModule } from "../characteristics.module";

import { PathUtilitiesModule } from "./path-utilities.module";
import { PathUtilitiesService } from "./path-utilities.service";

/** The token a consumer module gathers the shared service under, through a factory whose `inject` list only resolves exported providers. */
const SHARED = Symbol("SHARED");

describe(PathUtilitiesModule, () => {
  it("exports PathUtilitiesService to a consumer that imports it", async () => {
    const module = await Test.createTestingModule({
      imports: [PathUtilitiesModule],
      providers: [
        {
          inject: [PathUtilitiesService],
          provide: SHARED,
          useFactory: (service: PathUtilitiesService): PathUtilitiesService =>
            service,
        },
      ],
    }).compile();

    expect(module.get(SHARED)).toBeInstanceOf(PathUtilitiesService);
  });

  it("is the only provider of PathUtilitiesService across CharacteristicsModule", async () => {
    const module = await Test.createTestingModule({
      imports: [CharacteristicsModule, DiscoveryModule],
    }).compile();
    const providers: readonly { readonly instance: unknown }[] = module
      .get(DiscoveryService)
      .getProviders();

    expect(
      providers.filter(
        ({ instance }) => instance instanceof PathUtilitiesService,
      ),
    ).toHaveLength(1);
  });
});
