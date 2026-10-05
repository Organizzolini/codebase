import { Injectable } from "@nestjs/common";
import _ from "lodash";

import { AspectGraphService } from "../aspects/aspect-graph.service";
import { AspectPhaseEmojiService } from "../aspects/aspect-phase-emoji.service";
import { aspectBodies as quadrupleAspectBodies } from "../caelundas/caelundas.constants";
import {
  symbolByBody,
  symbolByQuadrupleAspect,
} from "../caelundas/symbol-caelundas.constants";

import type { AspectBodies } from "../aspects/aspects.types";
import type {
  Aspect,
  AspectPhase,
  Body,
  QuadrupleAspect,
} from "../caelundas/caelundas.types";
import type { Event } from "../calendar/calendar.types";
import type { GetQuadrupleAspectEventArguments } from "./quadruple-aspects.types";

/** Primitive helper methods for quadruple-aspect pattern detection and event shaping. */
@Injectable()
export class QuadrupleAspectsBaseService {
  // 🏗 Dependency Injection

  constructor(
    private readonly aspectGraphService: AspectGraphService,
    private readonly aspectPhaseEmojiService: AspectPhaseEmojiService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Creates a bidirectional lookup of each opposition endpoint to its opposite body.
   */
  buildGrandCrossOppositeMap(
    opp1: AspectBodies,
    opp2: AspectBodies,
  ): Map<Body, Body> {
    return new Map<Body, Body>([
      [opp1.bodies[0], opp1.bodies[1]],
      [opp1.bodies[1], opp1.bodies[0]],
      [opp2.bodies[0], opp2.bodies[1]],
      [opp2.bodies[1], opp2.bodies[0]],
    ]);
  }

  /**
   * Collapses forming+dissolving boundary events into one duration event.
   */
  buildProgressiveEvent(formingEvent: Event, dissolvingEvent: Event): Event {
    const categories = formingEvent.categories.filter(
      (c) => c !== "Forming" && c !== "Perfective" && c !== "Dissolving",
    );
    return {
      categories,
      description: formingEvent.description.replace(
        / (forming|exact|dissolving)( \(.*\))?$/i,
        "",
      ),
      end: dissolvingEvent.start,
      start: formingEvent.start,
      summary: formingEvent.summary.replace(/^(➡️|⬅️|🎯)\s/, ""),
    };
  }

  /**
   * Builds the human description and appends focal-body context when present.
   */
  buildQuadrupleAspectDescription(args: {
    bodiesSorted: string[];
    focalOrApexBody?: Body | undefined;
    phase: AspectPhase;
    quadrupleAspect: QuadrupleAspect;
  }): string {
    const { bodiesSorted, focalOrApexBody, phase, quadrupleAspect } = args;
    const base = `${bodiesSorted.join(", ")} ${quadrupleAspect} ${phase}`;
    return focalOrApexBody
      ? `${base} (${_.startCase(focalOrApexBody)} focal)`
      : base;
  }

  /**
   * Checks grand cross pattern.
   */
  checkGrandCrossPattern(args: {
    bodyList: Body[];
    edges: AspectBodies[];
    opp1: AspectBodies;
    opp2: AspectBodies;
  }): boolean {
    const { bodyList, edges, opp1, opp2 } = args;
    const aspectsByType = this.groupAspectsByType(edges);
    const oppositionsAtTime = aspectsByType.get("opposite") || [];
    const squaresAtTime = aspectsByType.get("square") || [];

    const hasOpp1 = this.haveAspect({
      aspectType: "opposite",
      body1: opp1.bodies[0],
      body2: opp1.bodies[1],
      edges: oppositionsAtTime,
    });
    const hasOpp2 = this.haveAspect({
      aspectType: "opposite",
      body1: opp2.bodies[0],
      body2: opp2.bodies[1],
      edges: oppositionsAtTime,
    });
    if (!hasOpp1 || !hasOpp2) return false;

    const oppositeBodyMap = this.buildGrandCrossOppositeMap(opp1, opp2);
    return this.verifyGrandCrossSquares(
      bodyList,
      oppositeBodyMap,
      squaresAtTime,
    );
  }

  /**
   * Checks kite pattern.
   */
  checkKitePattern(args: {
    baseBody: Body;
    edges: AspectBodies[];
    fourthBody: Body;
    other0: Body;
    other1: Body;
  }): boolean {
    const { baseBody, edges, fourthBody, other0, other1 } = args;
    return (
      this.haveAspect({
        aspectType: "opposite",
        body1: baseBody,
        body2: fourthBody,
        edges,
      }) &&
      this.haveAspect({
        aspectType: "trine",
        body1: baseBody,
        body2: other0,
        edges,
      }) &&
      this.haveAspect({
        aspectType: "trine",
        body1: baseBody,
        body2: other1,
        edges,
      }) &&
      this.haveAspect({
        aspectType: "trine",
        body1: other0,
        body2: other1,
        edges,
      }) &&
      this.haveAspect({
        aspectType: "sextile",
        body1: fourthBody,
        body2: other0,
        edges,
      }) &&
      this.haveAspect({
        aspectType: "sextile",
        body1: fourthBody,
        body2: other1,
        edges,
      })
    );
  }

  /**
   * Checks trine triple.
   */
  checkTrineTriple(args: {
    trineI: AspectBodies;
    trineJ: AspectBodies;
    trineK: AspectBodies;
    unionEdges: AspectBodies[];
  }): null | Set<Body> {
    const { trineI, trineJ, trineK, unionEdges } = args;
    const bodies = new Set<Body>([
      trineI.bodies[0],
      trineI.bodies[1],
      trineJ.bodies[0],
      trineJ.bodies[1],
      trineK.bodies[0],
      trineK.bodies[1],
    ]);
    if (bodies.size !== 3) return null;

    const [body0, body1, body2] = [...bodies];
    if (
      body0 &&
      body1 &&
      body2 &&
      this.haveAspect({
        aspectType: "trine",
        body1: body0,
        body2: body1,
        edges: unionEdges,
      }) &&
      this.haveAspect({
        aspectType: "trine",
        body1: body0,
        body2,
        edges: unionEdges,
      }) &&
      this.haveAspect({ aspectType: "trine", body1, body2, edges: unionEdges })
    ) {
      return bodies;
    }
    return null;
  }

  /**
   * Finds grand trines.
   */
  findGrandTrines(
    trines: AspectBodies[],
    unionEdges: AspectBodies[],
  ): Set<Body>[] {
    const grandTrines: Set<Body>[] = [];

    for (let index = 0; index < trines.length; index++) {
      const trineI = trines[index];
      if (!trineI) continue;
      for (let index_ = index + 1; index_ < trines.length; index_++) {
        const trineJ = trines[index_];
        if (!trineJ) continue;
        for (let index__ = index_ + 1; index__ < trines.length; index__++) {
          const trineK = trines[index__];
          if (!trineK) continue;
          const grandTrine = this.checkTrineTriple({
            trineI,
            trineJ,
            trineK,
            unionEdges,
          });
          if (grandTrine) grandTrines.push(grandTrine);
        }
      }
    }

    return grandTrines;
  }

  /**
   * Returns the other body in an aspect edge relative to the given body.
   */
  getOtherBody(edge: AspectBodies, body: Body): Body | null {
    if (edge.bodies[0] === body) {
      return edge.bodies[1];
    }
    if (edge.bodies[1] === body) {
      return edge.bodies[0];
    }
    return null;
  }

  /**
   * Maps aspect phase to the summary prefix marker.
   */
  getPhaseEmoji(phase: AspectPhase): string {
    return this.aspectPhaseEmojiService.getPhaseEmoji(phase);
  }

  /**
   * Creates one quadruple-aspect event with normalized categories and symbol-rich summary.
   */
  getQuadrupleAspectEvent(
    eventArguments: GetQuadrupleAspectEventArguments,
  ): Event {
    const {
      body1,
      body2,
      body3,
      body4,
      focalOrApexBody,
      phase,
      quadrupleAspect,
      timestamp,
    } = eventArguments;
    const body1DisplayName = _.startCase(body1);
    const body2DisplayName = _.startCase(body2);
    const body3DisplayName = _.startCase(body3);
    const body4DisplayName = _.startCase(body4);
    const description = this.buildQuadrupleAspectDescription({
      bodiesSorted: _.sortBy([
        body1DisplayName,
        body2DisplayName,
        body3DisplayName,
        body4DisplayName,
      ]),
      focalOrApexBody,
      phase,
      quadrupleAspect,
    });
    const phaseEmoji = this.getPhaseEmoji(phase);
    const symbolsPart = `${symbolByBody[body1]}-${symbolByBody[body2]}-${symbolByBody[body3]}-${symbolByBody[body4]}`;
    const summary = `${phaseEmoji}${symbolByQuadrupleAspect[quadrupleAspect]} ${symbolsPart} ${description}`;
    const categories = this.makeQuadrupleAspectCategories({
      body1Capitalized: body1DisplayName,
      body2Capitalized: body2DisplayName,
      body3Capitalized: body3DisplayName,
      body4Capitalized: body4DisplayName,
      focalOrApexBody,
      phase,
      quadrupleAspect,
    });
    return {
      categories,
      description,
      end: timestamp,
      start: timestamp,
      summary,
    };
  }

  /**
   * Groups aspects by type.
   */
  groupAspectsByType<T extends AspectBodies>(edges: T[]): Map<Aspect, T[]> {
    return this.aspectGraphService.groupAspectsByType(edges);
  }

  /**
   * Returns `true` when an undirected body pair has the requested aspect in the edge set.
   */
  haveAspect(args: {
    aspectType: Aspect;
    body1: Body;
    body2: Body;
    edges: AspectBodies[];
  }): boolean {
    return this.aspectGraphService.haveAspect(args);
  }

  /**
   * Makes progressive group key.
   */
  makeProgressiveGroupKey(event: Event): string {
    const planets = _.sortBy(
      event.categories.filter((category) =>
        quadrupleAspectBodies
          .map((quadrupleAspectBody) => _.startCase(quadrupleAspectBody))
          .includes(category),
      ),
    );
    const aspect = event.categories.find((category) =>
      ["Grand Cross", "Kite"].includes(category),
    );
    return `${planets.join("-")}_${aspect}`;
  }

  /**
   * Makes quadruple aspect categories.
   */
  makeQuadrupleAspectCategories(args: {
    body1Capitalized: string;
    body2Capitalized: string;
    body3Capitalized: string;
    body4Capitalized: string;
    focalOrApexBody?: Body | undefined;
    phase: AspectPhase;
    quadrupleAspect: QuadrupleAspect;
  }): string[] {
    const {
      body1Capitalized,
      body2Capitalized,
      body3Capitalized,
      body4Capitalized,
      focalOrApexBody,
      phase,
      quadrupleAspect,
    } = args;
    const categories = [
      "Astronomy",
      "Astrology",
      "Compound Aspect",
      "Quadruple Aspect",
      _.startCase(quadrupleAspect),
      _.startCase(phase),
      body1Capitalized,
      body2Capitalized,
      body3Capitalized,
      body4Capitalized,
    ];
    if (focalOrApexBody) {
      categories.push(`${_.startCase(focalOrApexBody)} Focal`);
    }
    return categories;
  }

  /**
   * Verifies grand cross squares.
   */
  verifyGrandCrossSquares(
    bodyList: Body[],
    oppositeBodyMap: Map<Body, Body>,
    squareEdges: AspectBodies[],
  ): boolean {
    for (const body of bodyList) {
      const oppositeBody = oppositeBodyMap.get(body) ?? null;
      if (!oppositeBody) return false;

      const adjacentBodies = bodyList.filter(
        (b) => b !== body && b !== oppositeBody,
      );
      for (const adjBody of adjacentBodies) {
        if (
          !this.haveAspect({
            aspectType: "square",
            body1: body,
            body2: adjBody,
            edges: squareEdges,
          })
        ) {
          return false;
        }
      }
    }
    return true;
  }
}
