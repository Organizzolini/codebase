import { projectDefaults } from "../../../configuration/callidescope.config.js";

/**
 * What lexico-cli is held to, measured rather than assumed.
 *
 * Seventeen is the workspace's own number, and `LexicoIngestionCommand.run`
 * is one of the three stacks pinning it — the workspace configuration names
 * this one alongside callidescope-nx's `depthExecutor` and `breadthExecutor`.
 * So this override changes nothing today and is written down anyway: the
 * workspace number is going to come down, and lowering this one is ordinary
 * follow-up work this task does not do — spec #589 puts it out of scope.
 *
 * Eight direct callees at the widest, where two callables tie:
 * `PronunciationEcclesiasticalService.processEcclesiasticalCharacter`
 * switching on one branch per Latin letter it re-classifies for
 * ecclesiastical pronunciation, and `LatinLibraryProvider.ingest`'s ordinary
 * sequential orchestration — read the cached index, build and expand
 * authors, sort and filter them, process each author's page, write each
 * author's texts, clean up metadata. Every traced project gates breadth now,
 * the orchestrator included, so the next step that pipeline gains is what
 * moves this number rather than what a tie once excused it from.
 *
 * Measured by a run scoped to this project and its dependency closure, and set
 * **at** what it measured rather than above it: a stack or a callable at either
 * limit passes, so this gate is green the day it arrives and each number is a
 * starting point to ratchet down from rather than a target to grow into.
 *
 * @see configuration/callidescope.config.ts — `projectDefaults`, spread below
 * for everything this file does not override
 */
export default {
  ...projectDefaults,
  limits: {
    maximumBreadth: 8,
    maximumDepth: 17,
  },
};
