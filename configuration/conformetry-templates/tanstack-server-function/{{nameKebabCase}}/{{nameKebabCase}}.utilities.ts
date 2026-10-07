{{! The plain logic the server functions delegate to, kept out of createServerFn so it is unit tested without the Start runtime, and named `.utilities.ts` because the workspace reads `.service.ts` as a NestJS class. }}
import type {
  {{namePascalCase}},
  Get{{namePascalCase}}Input,
  Post{{namePascalCase}}Input,
} from "./{{nameKebabCase}}.types";

// 🔏 Private Functions

// 🌎 Public Functions

/**
 * Finds the {{nameCamelCase}} record an input names.
 */
export function find{{namePascalCase}}(
  input: Get{{namePascalCase}}Input,
): {{namePascalCase}} {
  // TODO: Read the record from its data source.
  return { id: input.id, title: "" };
}

/**
 * Saves a {{nameCamelCase}} record and returns what was stored.
 */
export function save{{namePascalCase}}(
  input: Post{{namePascalCase}}Input,
): {{namePascalCase}} {
  // TODO: Write the record to its data source.
  return { id: input.id, title: input.title };
}
