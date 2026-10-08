// 🏷️ Types
import type { environmentSchema } from "../../constants";
import type { inputSchema } from "./input.constants";
import type { z } from "zod";

/**
 * Inferred type of the validated environment variables.
 */
export type Environment = z.infer<typeof environmentSchema>;

/**
 * Validated domain input for ephemeris calculations.
 */
export type Input = z.infer<typeof inputSchema>;
