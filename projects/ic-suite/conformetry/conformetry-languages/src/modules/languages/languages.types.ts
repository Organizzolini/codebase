// 🏷️ Types

/** Arguments for resolving the Languages one validation run needs. */
export interface ResolveValidatorsArguments {
  /**
   * Every distinct file extension the run's templates declare, including the
   * leading dot. Extensions no Language claims are routed to the Fallback.
   */
  readonly extensions: string[];
}
