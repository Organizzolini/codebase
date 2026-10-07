import path from "node:path";

import { z } from "zod";

import { postgresEnvironmentSchema } from "@codebase/database";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({
  ...postgresEnvironmentSchema({ project: "lexico" }),
  LEXICO_API_CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .describe("Comma-separated origins allowed to call the API from a browser")
    .transform((origins) =>
      origins
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  LEXICO_API_LIGHTSHIP_PORT: z.coerce.number().default(9000),
  LEXICO_API_PORT: z.coerce.number().default(8398),
});

/**
 * Where GraphQLModule emits the code-first schema: beside the root module,
 * rather than under `process.cwd()`. Anything that boots the module from the
 * repository root, such as codependix exploring the container from the root
 * project's `codependix` target, otherwise wrote a stray `src/schema.gql` there.
 */
export const GRAPHQL_SCHEMA_FILE = path.join(import.meta.dirname, "schema.gql");
