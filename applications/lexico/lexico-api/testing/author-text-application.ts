import { NestFactory } from "@nestjs/core";
import { z } from "zod";

import { Author, Line, Text } from "@codebase/lexico-entities";

import {
  type AuthorTextCatalog,
  seedAuthorTextCatalog,
} from "./author-text-catalog";
import { startLexicoDatabaseTestingModule } from "./database";

import type { INestApplication } from "@nestjs/common";
import type { Server } from "node:http";

/** The whole Lexico API, served over HTTP from the seeded author-text catalog. */
export interface AuthorTextApplication {
  readonly catalog: AuthorTextCatalog;
  readonly execute: (
    document: string,
    variables?: Record<string, unknown>,
  ) => Promise<AuthorTextResponse>;
  readonly server: INestApplication<Server>;
  readonly stop: () => Promise<void>;
}

/** Validates a GraphQL response body: data when execution succeeded, errors when not. */
const authorTextResponseSchema = z.object({
  data: z.record(z.string(), z.unknown()).nullish(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

/** A GraphQL response body: data when execution succeeded, errors when not. */
export type AuthorTextResponse = z.infer<typeof authorTextResponseSchema>;

/**
 * Seeds the author-text catalog into a freshly migrated `lexico_testing`
 * database, then boots the whole Lexico API against it, as `main` does, on an
 * ephemeral port, so a suite POSTs operations the way a browser would.
 * Stops the database again if seeding or booting fails.
 */
export async function startAuthorTextApplication(): Promise<AuthorTextApplication> {
  const database = await startLexicoDatabaseTestingModule([Author, Line, Text]);
  try {
    const catalog = await seedAuthorTextCatalog(database);

    // ⏳ ConfigModule reads the environment when the module is imported, so the
    // root module is imported only once the database's login is stubbed.
    const { LexicoApiModule } = await import("../src/lexico-api.module");
    const application = await NestFactory.create<INestApplication<Server>>(
      LexicoApiModule,
      { logger: false },
    );
    await application.listen(0, "127.0.0.1");
    const endpoint = `${await application.getUrl()}/graphql`;

    return {
      catalog,
      execute: async (
        document: string,
        variables: Record<string, unknown> = {},
      ): Promise<AuthorTextResponse> => {
        const response = await fetch(endpoint, {
          body: JSON.stringify({ query: document, variables }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        return authorTextResponseSchema.parse(await response.json());
      },
      server: application,
      stop: async (): Promise<void> => {
        await application.close();
        await database.close();
      },
    };
  } catch (error) {
    // 🧹 A failed seed or boot would otherwise leave the container running.
    await database.close();
    throw error;
  }
}
