import { DiscoveryModule, DiscoveryService } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { CharacteristicsModule } from "../characteristics.module";

import { CompoundUtilitiesModule } from "./compound-utilities.module";
import { CompoundUtilitiesService } from "./compound-utilities.service";

/** The token a consumer module gathers the shared service under, through a factory whose `inject` list only resolves exported providers. */
const SHARED = Symbol("SHARED");

describe(CompoundUtilitiesModule, () => {
  it("exports CompoundUtilitiesService to a consumer that imports it", async () => {
    const module = await Test.createTestingModule({
      imports: [CompoundUtilitiesModule],
      providers: [
        {
          inject: [CompoundUtilitiesService],
          provide: SHARED,
          useFactory: (
            service: CompoundUtilitiesService,
          ): CompoundUtilitiesService => service,
        },
      ],
    }).compile();

    expect(module.get(SHARED)).toBeInstanceOf(CompoundUtilitiesService);
  });

  it("is the only provider of CompoundUtilitiesService across CharacteristicsModule", async () => {
    const module = await Test.createTestingModule({
      imports: [CharacteristicsModule, DiscoveryModule],
    }).compile();
    const providers: readonly { readonly instance: unknown }[] = module
      .get(DiscoveryService)
      .getProviders();

    expect(
      providers.filter(
        ({ instance }) => instance instanceof CompoundUtilitiesService,
      ),
    ).toHaveLength(1);
  });
});
