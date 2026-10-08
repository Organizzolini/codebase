import { z } from "zod";

import { postgresEnvironmentSchema } from "@codebase/database";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({
  ...postgresEnvironmentSchema({ project: "lexico" }),
});
