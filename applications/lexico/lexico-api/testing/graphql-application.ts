import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import { z } from "zod";

import { startDatabaseTestingModule } from "@codebase/database/testing";
import {
  LEXICO_DATABASE_MIGRATIONS,
  LexicoDatabaseModule,
} from "@codebase/lexico-entities";

import { environmentSchema } from "../src/lexico-api.constants";
import { ORPHANED_GRAPHQL_TYPES } from "../src/lexico-api.entities";

import type { RepositoryOf } from "./word-lookups";
import type { DatabaseTestingModule } from "@codebase/database/testing";
import type { INestApplication, ModuleMetadata } from "@nestjs/common";
import type { Server } from "node:http";

/** Validates the body of a GraphQL response. */
const graphqlResponseSchema = z.object({
  data: z.record(z.string(), z.unknown()).nullish(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

/** The body of a GraphQL response: data, errors, or both. */
export type GraphqlResponse = z.infer<typeof graphqlResponseSchema>;

/** A lexico GraphQL API served over HTTP from a migrated test database. */
export interface LexicoGraphqlApplication {
  readonly query: (
    document: string,
    variables?: Record<string, unknown>,
  ) => Promise<GraphqlResponse>;
  readonly repository: RepositoryOf;
  readonly stop: () => Promise<void>;
}

/**
 * Serves the given feature modules the way the API does — Apollo over
 * Express, lexico's `LexicoDatabaseModule` read from `LEXICO_POSTGRES_*` —
 * against a freshly migrated Postgres container, on an ephemeral port, with
 * the schema built in memory rather than written beside the root module.
 */
export async function startLexicoGraphqlApplication(
  modules: NonNullable<ModuleMetadata["imports"]>,
): Promise<LexicoGraphqlApplication> {
  const database = await startDatabaseTestingModule({
    database: LexicoDatabaseModule,
    entities: [],
    imports: [
      GraphQLModule.forRoot<ApolloDriverConfig>({
        autoSchemaFile: true,
        buildSchemaOptions: { orphanedTypes: [...ORPHANED_GRAPHQL_TYPES] },
        driver: ApolloDriver,
        playground: false,
      }),
      ...modules,
    ],
    migrations: [...LEXICO_DATABASE_MIGRATIONS],
    project: "lexico",
    validate: (config) => environmentSchema.parse(config),
  });

  try {
    return await serve(database);
  } catch (error) {
    await database.close();
    throw error;
  }
}

/**
 * Listens on an ephemeral port and hands back a client that posts to the
 * GraphQL endpoint, closing the application before the database.
 */
async function serve(
  database: DatabaseTestingModule,
): Promise<LexicoGraphqlApplication> {
  const application =
    database.module.createNestApplication<INestApplication<Server>>();
  await application.listen(0, "127.0.0.1");
  const endpoint = `${await application.getUrl()}/graphql`;

  return {
    query: async (document, variables): Promise<GraphqlResponse> => {
      const response = await fetch(endpoint, {
        body: JSON.stringify({ query: document, variables }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      return graphqlResponseSchema.parse(await response.json());
    },
    repository: database.repository,
    stop: async (): Promise<void> => {
      await application.close();
      await database.close();
    },
  };
}
