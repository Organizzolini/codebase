// ♟️ Constants

import { z } from "zod";

export const epigraphikDatenbankChunkResponseSchema = z.object({
  data: z.array(z.unknown()),
});
