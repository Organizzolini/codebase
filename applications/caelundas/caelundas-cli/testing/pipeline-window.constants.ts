// ♟️ Constants

/**
 * How long a test that sweeps a window may run. A two-day sweep takes about
 * 18 s locally and the CI runner is 5 to 7 times slower, so this leaves room
 * for 7x. Re-size it from the first passing CI run rather than from local.
 */
export const PIPELINE_TEST_TIMEOUT_MILLISECONDS = 300_000;
