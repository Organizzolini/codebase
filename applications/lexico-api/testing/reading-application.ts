import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { vi } from "vitest";
import { z } from "zod";

import { startPostgresContainer } from "@codebase/database/testing";
import {
  AdjectivalForm,
  AdjectiveInflection,
  AdverbForm,
  AdverbInflection,
  DatabaseModule,
  FiniteVerbForm,
  GerundForm,
  InfinitiveForm,
  LEXICO_DATABASE_MIGRATIONS,
  NominalForm,
  NounInflection,
  ParticipleForm,
  PrepositionInflection,
  SupineForm,
  UninflectedInflection,
  VerbInflection,
} from "@codebase/lexico-entities";

import { environmentSchema } from "../src/lexico-api.constants";
import { LiteratureModule } from "../src/modules/literature/literature.module";

import { type ReadingPassage, seedReadingPassage } from "./reading-passage";

import type { StartedPostgresContainer } from "@codebase/database/testing";
import type { INestApplication } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import type { Server } from "node:http";

/** Validates the body of a GraphQL response. */
const readingResponseSchema = z.object({
  data: z.record(z.string(), z.unknown()).nullish(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

/** The literature API served over HTTP from the seeded reading passage. */
export interface ReadingApplication {
  readonly execute: (
    document: string,
    variables?: Record<string, unknown>,
  ) => Promise<ReadingResponse>;
  readonly module: TestingModule;
  readonly passage: ReadingPassage;
  readonly stop: () => Promise<void>;
}

/** The body of a GraphQL response: data, errors, or both. */
export type ReadingResponse = z.infer<typeof readingResponseSchema>;

/**
 * Seeds the reading passage into a freshly migrated `lexico_testing`
 * database and serves the literature module the way the API does, Apollo
 * over Express on an ephemeral port, with the schema built in memory rather
 * than written beside the root module.
 */
export async function startReadingApplication(): Promise<ReadingApplication> {
  const container: StartedPostgresContainer = await startPostgresContainer({
    migrations: [...LEXICO_DATABASE_MIGRATIONS],
    project: "lexico",
  });
  for (const [key, value] of Object.entries(container.environment)) {
    vi.stubEnv(key, value);
  }
  const stopContainer = async (): Promise<void> => {
    await container.stop();
    vi.unstubAllEnvs();
  };

  try {
    return await serveReadingPassage(stopContainer);
  } catch (error) {
    // 🧹 A failed seed or boot would otherwise leave the container running.
    await stopContainer();
    throw error;
  }
}

/** Boots the literature module, seeds the passage, and listens over HTTP. */
async function serveReadingPassage(
  stopContainer: () => Promise<void>,
): Promise<ReadingApplication> {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        isGlobal: true,
        validate: (config: Record<string, unknown>) =>
          environmentSchema.parse(config),
      }),
      GraphQLModule.forRoot<ApolloDriverConfig>({
        autoSchemaFile: true,
        buildSchemaOptions: {
          orphanedTypes: [
            NominalForm,
            FiniteVerbForm,
            ParticipleForm,
            AdverbForm,
            InfinitiveForm,
            GerundForm,
            SupineForm,
            AdjectivalForm,
            NounInflection,
            VerbInflection,
            AdjectiveInflection,
            AdverbInflection,
            PrepositionInflection,
            UninflectedInflection,
          ],
        },
        driver: ApolloDriver,
        playground: false,
      }),
      DatabaseModule,
      LiteratureModule,
    ],
  }).compile();

  const passage = await seedReadingPassage(module.get(DataSource));
  const application = module.createNestApplication<INestApplication<Server>>({
    logger: false,
  });
  await application.listen(0, "127.0.0.1");
  const endpoint = `${await application.getUrl()}/graphql`;

  return {
    execute: async (document, variables = {}): Promise<ReadingResponse> => {
      const response = await fetch(endpoint, {
        body: JSON.stringify({ query: document, variables }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      return readingResponseSchema.parse(await response.json());
    },
    module,
    passage,
    stop: async (): Promise<void> => {
      await application.close();
      await stopContainer();
    },
  };
}
