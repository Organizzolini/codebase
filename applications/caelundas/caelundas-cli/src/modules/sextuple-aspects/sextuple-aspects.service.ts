import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { CompoundPhaseService } from "../aspects/compound-phase.service";
import { MathService } from "../math/math.service";

import { SextupleAspectsComposerService } from "./sextuple-aspects-composer.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Body } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { ComposeHexagramsArguments } from "./sextuple-aspects.types";
import type { Moment } from "moment-timezone";

/**
 * Detects and pairs 6-body trine/sextile structures (hexagrams) from aspect snapshots.
 */
@Injectable()
export class SextupleAspectsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly sextupleAspectsComposerService: SextupleAspectsComposerService,
    private readonly mathService: MathService,
    private readonly compoundPhaseService: CompoundPhaseService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds sextuple-aspect hexagram events from trine and sextile edge snapshots. */
  private composeHexagrams(args: ComposeHexagramsArguments): Event[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    const unionEdges = [...currentAspectBodies, ...previousAspectBodies];
    const aspectsByType =
      this.sextupleAspectsComposerService.groupAspectsByType(unionEdges);
    const trines = aspectsByType.get("trine") || [];
    const sextiles = aspectsByType.get("sextile") || [];
    if (trines.length < 6 || sextiles.length < 6) return [];
    const bodies =
      this.sextupleAspectsComposerService.collectTrineBodies(trines);
    if (bodies.length < 6) return [];
    return this.processHexagramCombinations({
      combinations: this.mathService.getCombinations(bodies, 6),
      currentAspectBodies,
      minute,
      previousAspectBodies,
      unionEdges,
    });
  }

  /** Evaluates candidate six-body sets and emits events for valid hexagram configurations. */
  private processHexagramCombinations(args: {
    combinations: Body[][];
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
    unionEdges: AspectBodies[];
  }): Event[] {
    const {
      combinations,
      currentAspectBodies,
      minute,
      previousAspectBodies,
      unionEdges,
    } = args;
    const events: Event[] = [];
    for (const bodyCombination of combinations) {
      const hexagramBodies =
        this.sextupleAspectsComposerService.findHexagramPattern(
          bodyCombination,
          unionEdges,
        );
      if (!hexagramBodies) continue;
      const phaseTransition =
        this.compoundPhaseService.determineCompoundPhaseFromSnapshots({
          checkPatternExists: (edges) =>
            this.sextupleAspectsComposerService.findHexagramPattern(
              hexagramBodies,
              edges,
            ) !== null,
          currentAspectBodies,
          currentMinute: minute,
          patternBodies: hexagramBodies,
          previousAspectBodies,
        });
      if (!phaseTransition) continue;
      const event = this.sextupleAspectsComposerService.buildHexagramEvent(
        hexagramBodies,
        phaseTransition.phase,
        phaseTransition.eventMinute,
      );
      if (event) events.push(event);
    }
    return events;
  }

  // 🌎 Public Methods

  /**
   * Detects all sextuple aspect patterns from stored 2-body aspect events.
   *
   * Currently detects the Hexagram (Star of David) pattern, which is one
   * of the rarest and most spiritually significant configurations.
   *
   */
  detect(args: {
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
  }): Event[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    return this.composeHexagrams({
      currentAspectBodies,
      minute,
      previousAspectBodies,
    });
  }

  /**
   * Converts instantaneous sextuple aspect events into progressive events.
   *
   * Pairs forming and dissolving events for the same body sextet and
   * pattern type to create events spanning the entire active period.
   *
   */
  detectProgressive(events: Event[]): Event[] {
    const progressiveEvents: Event[] = [];
    const groupedEvents =
      this.sextupleAspectsComposerService.groupSextupleEventsByKey(events);

    for (const group of Object.values(groupedEvents)) {
      const sortedEvents = _.sortBy(group, "start");

      for (let index = 0; index < sortedEvents.length; index++) {
        const currentEvent = sortedEvents[index];

        if (!currentEvent?.categories.includes("Forming")) {
          continue;
        }

        for (
          let secondIndex = index + 1;
          secondIndex < sortedEvents.length;
          secondIndex++
        ) {
          const potentialDissolvingEvent = sortedEvents[secondIndex];

          if (!potentialDissolvingEvent) {
            continue;
          }

          if (potentialDissolvingEvent.categories.includes("Dissolving")) {
            progressiveEvents.push(
              this.sextupleAspectsComposerService.buildProgressiveSextupleEvent(
                currentEvent,
                potentialDissolvingEvent,
              ),
            );
            break;
          }
        }
      }
    }

    return progressiveEvents;
  }
}
