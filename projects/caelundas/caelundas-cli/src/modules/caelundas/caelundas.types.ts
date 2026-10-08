// 🏷️ Types
import {
  aspects,
  bodies,
  lunarPhases,
  majorAspects,
  minorAspects,
  signs,
  specialtyAspects,
} from "./caelundas.constants";
import { symbolByDecan } from "./symbol-caelundas.constants";

import type {
  aspectPhases,
  eclipsePhases,
  retrogradeBodies,
} from "./caelundas.constants";
import type {
  symbolByAsteroid,
  symbolByBody,
  symbolByLunarPhase,
  symbolByMajorAspect,
  symbolByMartianPhase,
  symbolByMercurianPhase,
  symbolByMinorAspect,
  symbolByNode,
  symbolByOrbitalDirection,
  symbolByPlanet,
  symbolByQuadrupleAspect,
  symbolByQuintupleAspect,
  symbolBySextupleAspect,
  symbolBySign,
  symbolBySpecialtyAspect,
  symbolByTripleAspect,
  symbolByVenusianPhase,
} from "./symbol-caelundas.constants";
/**
 * Union of all two-body aspect types (major, minor, and specialty).
 */
export type Aspect = (typeof aspects)[number];

/**
 * Phase of an aspect's lifecycle (applying, exact, or separating).
 *
 * Describes whether two bodies are approaching, at, or departing from
 * an exact angular relationship.
 *
 * @remarks
 * Phase values:
 * - "applying": Bodies approaching exact aspect angle (within orb)
 * - "perfective": Bodies at precise aspect angle
 * - "separating": Bodies departing from exact aspect angle (within orb)
 *
 * Applying aspects are considered more potent than separating aspects in
 * traditional astrological interpretation.
 *
 * @see {@link getMajorAspectEvents} for aspect phase detection
 */
export type AspectPhase = (typeof aspectPhases)[number];

// 🔟 Decans

/**
 * Asteroids (minor planets) tracked for astrological significance.
 *
 * Includes major asteroids: Ceres, Pallas, Juno, Vesta, Chiron.
 */
export type Asteroid = keyof typeof symbolByAsteroid;

/**
 * Union of all celestial body types tracked by caelundas.
 *
 * Encompasses planets, asteroids, comets, and calculated lunar points.
 * Primary type used for ephemeris queries and aspect calculations.
 */
export type Body = keyof typeof symbolByBody;

// 🪐 Planets

// export type PlanetSymbol = (typeof symbolByPlanet)[Planet];

// 💫 Asteroids

/**
 * Decan representing a 10-degree subdivision within a zodiac sign.
 *
 * Each sign is divided into three decans (e.g., "aries 1", "aries 2", "aries 3").
 */
export type Decan = keyof typeof symbolByDecan;

/**
 * Phase of an eclipse event (partial, total, annular, or penumbral).
 *
 * Describes the type and magnitude of a solar or lunar eclipse.
 *
 * @remarks
 * Eclipse phase values:
 * - "partial": Moon or Sun partially obscured
 * - "total": Complete obscuration (lunar eclipse or solar totality)
 * - "annular": Ring of light visible around Moon (solar eclipse)
 * - "penumbral": Moon passes through Earth's penumbral shadow only
 *
 * @see {@link getEclipseEvents} for eclipse detection and classification
 */
export type EclipsePhase = (typeof eclipsePhases)[number];

/**
 * Lunar phase representing the Moon's illumination state as seen from Earth.
 *
 * Eight phases from new moon (0°) through full moon (180°) and back.
 */
export type LunarPhase = keyof typeof symbolByLunarPhase;

/**
 * Major aspects representing primary angular relationships between bodies.
 *
 * Includes conjunction (0°), sextile (60°), square (90°), trine (120°),
 * opposition (180°) with orbs of ±6-8°.
 */
export type MajorAspect = keyof typeof symbolByMajorAspect;

/**
 * Mars phase representing its illumination and visibility state from Earth.
 *
 * Mars exhibits limited phase variation (never appears as a crescent) because
 * it orbits outside Earth's orbit.
 */
export type MartianPhase = keyof typeof symbolByMartianPhase;

/**
 * Mercury phase representing its illumination and visibility state from Earth.
 *
 * Mercury exhibits phases similar to Venus due to its orbit inside Earth's orbit.
 * Phases cycle more quickly than Venus (approximately 116 days per synodic period).
 */
export type MercurianPhase = keyof typeof symbolByMercurianPhase;

/**
 * Minor aspects representing secondary angular relationships between bodies.
 *
 * Includes semi-sextile (30°), semi-square (45°), sesquiquadrate (135°),
 * quincunx (150°) with ±3° orbs.
 */
export type MinorAspect = keyof typeof symbolByMinorAspect;

/**
 * Lunar nodes and apsides representing calculated points in the Moon's orbit.
 *
 * Includes north/south nodes (ecliptic intersections) and lunar perigee/apogee
 * (closest/farthest points from Earth).
 */
export type Node = keyof typeof symbolByNode;

/**
 * Direction of a planet's apparent motion relative to the zodiac.
 *
 * Values: "direct" (eastward), "retrograde" (westward), "stationary" (transition).
 */
export type OrbitalDirection = keyof typeof symbolByOrbitalDirection;

/**
 * Classical and modern planets tracked for ephemeris calculations.
 *
 * Includes luminaries (Sun, Moon), inner planets (Mercury, Venus, Mars),
 * social planets (Jupiter, Saturn), and outer planets (Uranus, Neptune, Pluto).
 */
export type Planet = keyof typeof symbolByPlanet;

/**
 * Four-body aspect patterns formed by specific angular relationships.
 *
 * Quadruple aspects represent complex geometric configurations involving
 * four celestial bodies in balanced angular relationships.
 *
 * @remarks
 * Pattern definitions:
 * - "grand cross": Four bodies forming two oppositions (180°) and four squares (90°)
 * - "kite": Grand trine with a fourth body opposite one of the trine bodies
 * - "mystic rectangle": Two oppositions (180°) connected by four sextiles (60°)
 *
 * @see {@link getQuadrupleAspectEvents} for pattern detection
 */
export type QuadrupleAspect = keyof typeof symbolByQuadrupleAspect;

/**
 * Five-body aspect patterns (rare geometric configurations).
 *
 * Quintuple aspects represent highly complex and rare alignments
 * involving five celestial bodies simultaneously.
 *
 * @remarks
 * These patterns are extremely rare and typically only form with asteroids
 * and lunar nodes included in calculations.
 *
 * @see {@link getQuintupleAspectEvents} for detection algorithm
 */
export type QuintupleAspect = keyof typeof symbolByQuintupleAspect;

/**
 * Celestial body that exhibits retrograde motion.
 *
 * Only planets (excluding luminaries Sun and Moon) can appear to move
 * retrograde from Earth's perspective.
 *
 * @remarks
 * Retrograde bodies include:
 * - Inner planets: Mercury, Venus, Mars
 * - Outer planets: Jupiter, Saturn, Uranus, Neptune, Pluto
 *
 * Sun and Moon never go retrograde. Asteroids and nodes can also exhibit
 * retrograde motion but are not currently tracked.
 *
 * @see {@link getRetrogradeEvents} for retrograde detection
 * @see {@link OrbitalDirection} for direction states
 */
export type RetrogradeBody = (typeof retrogradeBodies)[number];

// export type LunarPhaseSymbol = (typeof symbolByLunarPhase)[LunarPhase];

// ♀️ Venusian Phases

/**
 * Six-body aspect patterns (extremely rare geometric configurations).
 *
 * Sextuple aspects represent the most complex multi-body alignments,
 * requiring all bodies to be in precise angular relationships.
 *
 * @remarks
 * Pattern definitions:
 * - "grand sextile": Six bodies each 60° apart forming a perfect hexagon
 * - "star of david": Two overlapping grand trines 60° apart
 *
 * These patterns are exceedingly rare in actual celestial configurations.
 *
 * @see {@link getSextupleAspectEvents} for detection algorithm
 */
export type SextupleAspect = keyof typeof symbolBySextupleAspect;

/**
 * Zodiac sign representing a 30-degree segment of the ecliptic.
 *
 * The zodiac is divided into 12 equal signs starting from the vernal equinox (0° Aries).
 * Signs are tropical (aligned with seasons) rather than sidereal.
 */
export type Sign = keyof typeof symbolBySign;

// ☿️ Mercurian Phases

// ♂️ Martian Phases

/**
 * Specialty aspects based on harmonic divisions of the zodiac circle.
 *
 * Includes quintile (72°), biquintile (144°), septile (51.43°), novile (40°)
 * with ±1-2° orbs.
 */
export type SpecialtyAspect = keyof typeof symbolBySpecialtyAspect;

// 📐 Aspect Phases

/**
 * Unicode symbol representing a specialty aspect.
 */
export type SpecialtyAspectSymbol =
  (typeof symbolBySpecialtyAspect)[SpecialtyAspect];

/**
 * Three-body aspect patterns: grand trine, t-square, yod.
 *
 * Complex geometric configurations formed when multiple planets create
 * specific angular relationships. These patterns are evaluated in real-time
 * for geometric completion with a third body.
 *
 * @see {@link getTripleAspectEvents} for pattern detection algorithm
 * @see {@link getAspectBodiesAt} for retrieving active aspect context
 */
export type TripleAspect = keyof typeof symbolByTripleAspect;

// 🔭 Body Types

/**
 * Venus phase representing its illumination and visibility state from Earth.
 *
 * Phases correlate with Venus's synodic cycle and visibility as morning/evening star.
 * Occurs in an 8-year cycle (5 synodic periods = 8 Earth years).
 */
export type VenusianPhase = keyof typeof symbolByVenusianPhase;

/**
 * Uppercases the first character of a string literal type.
 *
 * Mirrors `Capitalize<T>` at the value level. Prefer this over
 * `_.startCase` + `as Capitalize<T>` — the assertion is confined here.
 * @example
 * ```ts
 * const bodyCapitalized = capitalize(body);
 * // ^? Capitalize<Body>
 * ```
 */
export function capitalize<T extends string>(str: T): Capitalize<T> {
  // type-coverage:ignore-next-line
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>;
}

/**
 * Groups an array of items by a key function and returns a typed `Map`.
 *
 * Fully preserves the key type `K`, avoiding the `string`-widening that
 * `Object.entries(_.groupBy(...))` produces.
 *
 * @example
 * ```ts
 * const byAspect = groupByToMap(edges, (e) => e.aspect);
 * // ^? Map<Aspect, AspectBodies[]>
 * ```
 */
export function groupByToMap<K extends PropertyKey, T>(
  items: T[],
  keyFunction: (item: T) => K,
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFunction(item);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/**
 * Narrows an arbitrary string to the `Aspect` union at runtime.
 */
export function isAspect(aspect: string): aspect is Aspect {
  return (aspects as readonly string[]).includes(aspect);
}

/**
 * Narrows an arbitrary string to the `Body` union at runtime.
 */
export function isBody(body: string): body is Body {
  return (bodies as readonly string[]).includes(body);
}

/**
 * Narrows an arbitrary string to the `Decan` union at runtime.
 */
export function isDecan(decan: string): decan is Decan {
  return Object.hasOwn(symbolByDecan, decan);
}

/**
 * Type guard that checks whether a value is a key of the given object.
 *
 * Use instead of `value as keyof T` when indexing into a `const` object,
 * or in place of `key in object` casts.
 *
 *
 * @example
 * ```ts
 * if (isKeyOf(symbolByStellium, stelliumType)) {
 *   const symbol = symbolByStellium[stelliumType]; // no cast
 * }
 * ```
 */
export function isKeyOf<T extends object>(
  object: T,
  key: PropertyKey,
): key is keyof T {
  return key in object;
}

/**
 * Narrows an arbitrary string to the `LunarPhase` union at runtime.
 */
export function isLunarPhase(lunarPhase: string): lunarPhase is LunarPhase {
  return (lunarPhases as readonly string[]).includes(lunarPhase);
}

/**
 * Narrows an arbitrary string to the `MajorAspect` union at runtime.
 */
export function isMajorAspect(majorAspect: string): majorAspect is MajorAspect {
  return (majorAspects as readonly string[]).includes(majorAspect);
}

/**
 * Narrows an arbitrary string to the `MinorAspect` union at runtime.
 */
export function isMinorAspect(minorAspect: string): minorAspect is MinorAspect {
  return (minorAspects as readonly string[]).includes(minorAspect);
}

/**
 * Narrows an arbitrary string to the `Sign` union at runtime.
 */
export function isSign(sign: string): sign is Sign {
  return (signs as readonly string[]).includes(sign);
}

/**
 * Narrows an arbitrary string to the `SpecialtyAspect` union at runtime.
 */
export function isSpecialtyAspect(
  specialtyAspect: string,
): specialtyAspect is SpecialtyAspect {
  return (specialtyAspects as readonly string[]).includes(specialtyAspect);
}

/**
 * Returns a typed version of `Object.entries` that preserves the key union.
 *
 * `Object.entries` always returns `[string, V][]` in the standard lib.
 * This wrapper narrows the key to `K` when the record is typed as
 * `Record<K, V>`.
 *
 * @example
 * ```ts
 * const entries = objectEntries(degreeRangeBySign);
 * // ^? [Sign, { min: number; max: number }][]
 * ```
 */
export function objectEntries<K extends string, V>(
  record: Record<K, V>,
): [K, V][] {
  // type-coverage:ignore-next-line
  return Object.entries(record) as [K, V][];
}

/**
 * Strongly-typed wrapper around `Object.fromEntries()` that preserves the key union type.
 *
 * `Object.fromEntries()` always returns `Record<string, V>` by design, so a cast is
 * required to recover the typed key. This helper centralizes that cast in one place.
 *
 * @example
 * ```ts
 * const record = typedFromEntries(bodies.map(body => [body, compute(body)]));
 * // ^? Record<Body, ComputedType>
 * ```
 */
export function typedFromEntries<K extends string, V>(
  entries: [K, V][],
): Record<K, V> {
  // type-coverage:ignore-next-line
  return Object.fromEntries(entries) as Record<K, V>;
}

/**
 * Lowercases the first character of a string literal type.
 */
export function uncapitalize<T extends string>(str: T): Uncapitalize<T> {
  // type-coverage:ignore-next-line
  return (str.charAt(0).toLowerCase() + str.slice(1)) as Uncapitalize<T>;
}
