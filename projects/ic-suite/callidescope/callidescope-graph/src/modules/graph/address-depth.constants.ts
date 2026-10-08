// ♟️ Constants

/**
 * How many paths `AddressDepthService` enumerates in one direction before it
 * stops.
 *
 * A single deepest path, which is all `PathsService` ever materializes, is
 * bounded by construction. Enumerating every path is not: a callable reached
 * from a dozen places whose callees fan out just as wide multiplies those
 * branches together, so a cap is what keeps a widely-called utility from
 * making the walk run away instead of returning.
 */
export const MAXIMUM_CALL_ADDRESS_STACKS = 200;
