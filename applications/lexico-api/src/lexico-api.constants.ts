import path from "node:path";

import { z } from "zod";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({
  LEXICO_API_LIGHTSHIP_PORT: z.coerce.number().default(9000),
  LEXICO_API_PORT: z.coerce.number().default(8398),
  POSTGRES_DB: z.string().default("postgres"),
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PASSWORD: z.string().default("postgres"),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_USER: z.string().default("postgres"),
});

/**
 * Where GraphQLModule emits the code-first schema: beside the root module,
 * rather than under `process.cwd()`. Anything that boots the module from the
 * repository root, such as codependix exploring the container from the root
 * project's `codependix` target, otherwise wrote a stray `src/schema.gql` there.
 */
export const GRAPHQL_SCHEMA_FILE = path.join(import.meta.dirname, "schema.gql");
