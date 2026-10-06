import type {
  get{{namePascalCase}}InputSchema,
  post{{namePascalCase}}InputSchema,
} from "./{{nameKebabCase}}.constants";
import type { z } from "zod";

// 🏷️ Types

/**
 * TODO: Document the {{nameCamelCase}} record.
 */
export interface {{namePascalCase}} {
  id: string;
  title: string;
}

/**
 * What get{{namePascalCase}} is called with.
 */
export type Get{{namePascalCase}}Input = z.infer<
  typeof get{{namePascalCase}}InputSchema
>;

/**
 * What post{{namePascalCase}} is called with.
 */
export type Post{{namePascalCase}}Input = z.infer<
  typeof post{{namePascalCase}}InputSchema
>;
