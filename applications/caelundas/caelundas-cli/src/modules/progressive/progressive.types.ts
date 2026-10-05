// 🏷️ Types

/**
 * Typed aspect and body labels extracted from an event.
 */
export interface TypedAspectParts<
  TAspect extends string,
  TBody extends string,
> {
  aspect: TAspect;
  aspectCapitalized: string;
  body1: TBody;
  body1Capitalized: string;
  body2: TBody;
  body2Capitalized: string;
}
