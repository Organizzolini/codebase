import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { CompoundPhaseService } from "../aspects/compound-phase.service";

import { TripleAspectsComposerService } from "./triple-aspects-composer.service";

import type { AspectBodies } from "../aspects/aspects.types";
import type { Aspect, Body } from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { Moment } from "moment-timezone";

/**
 * Detects triple-aspect configurations (grand trine, T-square, yod) from aspect snapshots.
 */
@Injectable()
export class TripleAspectsDetectorService {
  // 🏗 Dependency Injection

  constructor(
    private readonly aspectGraphService: AspectGraphService,
    private readonly compoundPhaseService: CompoundPhaseService,
    private readonly tripleAspectsComposerService: TripleAspectsComposerService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Handles check grand trine triplet.
   */
  private checkGrandTrineTriplet(args: {
    body1: Body;
    body2: Body;
    body3: Body;
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
    trines: AspectBodies[];
  }): Event | null {
    const {
      body1,
      body2,
      body3,
      currentAspectBodies,
      minute,
      previousAspectBodies,
      trines,
    } = args;

    if (!this.isGrandTrine({ body1, body2, body3, edges: trines })) {
      return null;
    }

    const result =
      this.compoundPhaseService.determineCompoundPhaseFromSnapshots({
        checkPatternExists: (edges) =>
          this.isGrandTrine({ body1, body2, body3, edges }),
        currentAspectBodies,
        currentMinute: minute,
        patternBodies: [body1, body2, body3],
        previousAspectBodies,
      });

    if (!result) {
      return null;
    }

    return this.tripleAspectsComposerService.buildTripleAspectEvent({
      body1,
      body2,
      body3,
      phase: result.phase,
      timestamp: result.eventMinute,
      tripleAspect: "grand trine",
    });
  }

  /**
   * Handles the t square pattern check for a candidate focal body.
   */
  private checkTSquareFocalBody(args: {
    body1: Body;
    body2: Body;
    currentAspectBodies: AspectBodies[];
    focalBody: Body;
    minute: Moment;
    previousAspectBodies: AspectBodies[];
    unionEdges: AspectBodies[];
  }): Event | null {
    const {
      body1,
      body2,
      currentAspectBodies,
      focalBody,
      minute,
      previousAspectBodies,
      unionEdges,
    } = args;

    if (!this.isTSquare({ body1, body2, edges: unionEdges, focalBody })) {
      return null;
    }

    const result =
      this.compoundPhaseService.determineCompoundPhaseFromSnapshots({
        checkPatternExists: (edges) =>
          this.isTSquare({ body1, body2, edges, focalBody }),
        currentAspectBodies,
        currentMinute: minute,
        patternBodies: [body1, body2, focalBody],
        previousAspectBodies,
      });

    if (!result) {
      return null;
    }

    return this.tripleAspectsComposerService.buildTripleAspectEvent({
      body1,
      body2,
      body3: focalBody,
      focalOrApexBody: focalBody,
      phase: result.phase,
      timestamp: result.eventMinute,
      tripleAspect: "t-square",
    });
  }

  /**
   * Handles check yod apex body.
   */
  private checkYodApexBody(args: {
    apexBody: Body;
    body1: Body;
    body2: Body;
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
    unionEdges: AspectBodies[];
  }): Event | null {
    const {
      apexBody,
      body1,
      body2,
      currentAspectBodies,
      minute,
      previousAspectBodies,
      unionEdges,
    } = args;

    if (!this.isYod({ apexBody, body1, body2, edges: unionEdges })) {
      return null;
    }

    const result =
      this.compoundPhaseService.determineCompoundPhaseFromSnapshots({
        checkPatternExists: (edges) =>
          this.isYod({ apexBody, body1, body2, edges }),
        currentAspectBodies,
        currentMinute: minute,
        patternBodies: [body1, body2, apexBody],
        previousAspectBodies,
      });

    if (!result) {
      return null;
    }

    return this.tripleAspectsComposerService.buildTripleAspectEvent({
      body1,
      body2,
      body3: apexBody,
      focalOrApexBody: apexBody,
      phase: result.phase,
      timestamp: result.eventMinute,
      tripleAspect: "yod",
    });
  }

  /**
   * Enumerates unique ordered body triplets.
   */
  private getUniqueBodyTriplets(bodies: Body[]): [Body, Body, Body][] {
    const triplets: [Body, Body, Body][] = [];
    for (let index = 0; index < bodies.length; index++) {
      for (
        let secondIndex = index + 1;
        secondIndex < bodies.length;
        secondIndex++
      ) {
        for (
          let thirdIndex = secondIndex + 1;
          thirdIndex < bodies.length;
          thirdIndex++
        ) {
          const body1 = bodies[index];
          const body2 = bodies[secondIndex];
          const body3 = bodies[thirdIndex];
          if (body1 && body2 && body3) {
            triplets.push([body1, body2, body3]);
          }
        }
      }
    }
    return triplets;
  }

  /**
   * Indexes aspect edges by aspect type for efficient pattern checks.
   */
  private groupAspectsByType<T extends AspectBodies>(
    edges: T[],
  ): Map<Aspect, T[]> {
    return this.aspectGraphService.groupAspectsByType(edges);
  }

  /**
   * Determines whether grand trine.
   */
  private isGrandTrine(args: {
    body1: Body;
    body2: Body;
    body3: Body;
    edges: AspectBodies[];
  }): boolean {
    const { body1, body2, body3, edges } = args;
    return (
      this.tripleAspectsComposerService.haveAspect({
        aspectType: "trine",
        body1,
        body2,
        edges,
      }) &&
      this.tripleAspectsComposerService.haveAspect({
        aspectType: "trine",
        body1,
        body2: body3,
        edges,
      }) &&
      this.tripleAspectsComposerService.haveAspect({
        aspectType: "trine",
        body1: body2,
        body2: body3,
        edges,
      })
    );
  }

  /**
   * Determines whether the current edge set forms a t square pattern.
   */
  private isTSquare(args: {
    body1: Body;
    body2: Body;
    edges: AspectBodies[];
    focalBody: Body;
  }): boolean {
    const { body1, body2, edges, focalBody } = args;
    return (
      this.tripleAspectsComposerService.haveAspect({
        aspectType: "opposite",
        body1,
        body2,
        edges,
      }) &&
      this.tripleAspectsComposerService.haveAspect({
        aspectType: "square",
        body1,
        body2: focalBody,
        edges,
      }) &&
      this.tripleAspectsComposerService.haveAspect({
        aspectType: "square",
        body1: body2,
        body2: focalBody,
        edges,
      })
    );
  }

  /**
   * Determines whether yod.
   */
  private isYod(args: {
    apexBody: Body;
    body1: Body;
    body2: Body;
    edges: AspectBodies[];
  }): boolean {
    const { apexBody, body1, body2, edges } = args;
    return (
      this.tripleAspectsComposerService.haveAspect({
        aspectType: "sextile",
        body1,
        body2,
        edges,
      }) &&
      this.tripleAspectsComposerService.haveAspect({
        aspectType: "quincunx",
        body1,
        body2: apexBody,
        edges,
      }) &&
      this.tripleAspectsComposerService.haveAspect({
        aspectType: "quincunx",
        body1: body2,
        body2: apexBody,
        edges,
      })
    );
  }

  // 🌎 Public Methods

  /**
   * Detects grand trines by evaluating all unique body triplets connected by trines.
   */
  composeGrandTrines(args: {
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
  }): Event[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    const unionEdges = [...currentAspectBodies, ...previousAspectBodies];
    const trines = this.groupAspectsByType(unionEdges).get("trine") || [];

    const bodiesInTrines = new Set<Body>();
    for (const trine of trines) {
      bodiesInTrines.add(trine.bodies[0]);
      bodiesInTrines.add(trine.bodies[1]);
    }

    const bodiesArray = [...bodiesInTrines];
    const events: Event[] = [];

    for (const [body1, body2, body3] of this.getUniqueBodyTriplets(
      bodiesArray,
    )) {
      const event = this.checkGrandTrineTriplet({
        body1,
        body2,
        body3,
        currentAspectBodies,
        minute,
        previousAspectBodies,
        trines,
      });
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Detects T-squares from opposition baselines and shared square focal bodies.
   */
  composeTSquares(args: {
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
  }): Event[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    const unionEdges = [...currentAspectBodies, ...previousAspectBodies];
    const aspectsByType = this.groupAspectsByType(unionEdges);
    const oppositions = aspectsByType.get("opposite") || [];
    const squares = aspectsByType.get("square") || [];
    const events: Event[] = [];

    for (const opposition of oppositions) {
      const body1 = opposition.bodies[0];
      const body2 = opposition.bodies[1];
      const body1SquareBodies =
        this.tripleAspectsComposerService.findBodiesWithAspectTo(
          body1,
          "square",
          squares,
        );
      const body2SquareBodies =
        this.tripleAspectsComposerService.findBodiesWithAspectTo(
          body2,
          "square",
          squares,
        );

      for (const focalBody of _.intersection(
        body1SquareBodies,
        body2SquareBodies,
      )) {
        const event = this.checkTSquareFocalBody({
          body1,
          body2,
          currentAspectBodies,
          focalBody,
          minute,
          previousAspectBodies,
          unionEdges,
        });
        if (event) {
          events.push(event);
        }
      }
    }

    return events;
  }

  /**
   * Detects yods from sextile baselines and shared quincunx apex bodies.
   */
  composeYods(args: {
    currentAspectBodies: AspectBodies[];
    minute: Moment;
    previousAspectBodies: AspectBodies[];
  }): Event[] {
    const { currentAspectBodies, minute, previousAspectBodies } = args;
    const unionEdges = [...currentAspectBodies, ...previousAspectBodies];
    const aspectsByType = this.groupAspectsByType(unionEdges);
    const sextiles = aspectsByType.get("sextile") || [];
    const quincunxes = aspectsByType.get("quincunx") || [];
    const events: Event[] = [];

    for (const sextile of sextiles) {
      const body1 = sextile.bodies[0];
      const body2 = sextile.bodies[1];
      const body1QuincunxBodies =
        this.tripleAspectsComposerService.findBodiesWithAspectTo(
          body1,
          "quincunx",
          quincunxes,
        );
      const body2QuincunxBodies =
        this.tripleAspectsComposerService.findBodiesWithAspectTo(
          body2,
          "quincunx",
          quincunxes,
        );

      for (const apexBody of _.intersection(
        body1QuincunxBodies,
        body2QuincunxBodies,
      )) {
        const event = this.checkYodApexBody({
          apexBody,
          body1,
          body2,
          currentAspectBodies,
          minute,
          previousAspectBodies,
          unionEdges,
        });
        if (event) {
          events.push(event);
        }
      }
    }

    return events;
  }
}
