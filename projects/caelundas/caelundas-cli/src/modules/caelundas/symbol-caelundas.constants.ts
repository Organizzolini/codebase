// 🪧 Signs

/**
 * Maps each zodiac sign to its Unicode symbol.
 * Uses standard astrological glyphs from the Unicode Miscellaneous Symbols block.
 */
export const symbolBySign = {
  aquarius: "♒︎",
  aries: "♈",
  cancer: "♋︎",
  capricorn: "♑︎",
  gemini: "♊︎",
  leo: "♌︎",
  libra: "♎︎",
  pisces: "♓︎",
  sagittarius: "♐︎",
  scorpio: "♏︎",
  taurus: "♉︎",
  virgo: "♍︎",
} as const;

// 🔟 Decans

/**
 * Maps each decan number (1-3) to its emoji representation.
 * Each zodiac sign is divided into three decans of 10° each.
 */
export const symbolByDecan = {
  "1": "1️⃣",
  "2": "2️⃣",
  "3": "3️⃣",
} as const;

// 🪐 Planets

/**
 * Maps each classical and modern planet to its Unicode symbol.
 * Includes Sun and Moon as luminaries in traditional astrological usage.
 */
export const symbolByPlanet = {
  jupiter: "♃",
  mars: "♂️",
  mercury: "☿",
  moon: "🌙",
  neptune: "♆",
  pluto: "♇",
  saturn: "♄",
  sun: "☀️",
  uranus: "♅",
  venus: "♀️",
} as const;

// 💫 Asteroids

/**
 * Maps each asteroid to its Unicode symbol.
 * Includes Chiron (centaur) and the four main belt asteroids used in modern astrology.
 */
export const symbolByAsteroid = {
  ceres: "⚳",
  chiron: "⚷",
  juno: "⚵",
  lilith: "⚸",
  pallas: "⚴",
  vesta: "⚶",
} as const;

// ☄️ Comets

/**
 * Maps each comet to its emoji representation.
 * Currently includes Halley's comet as the most notable periodic comet.
 */
// export const symbolByComet = {
//   halley: "☄",
// } as const;

// 🌕 Nodes

/**
 * Maps lunar nodes and lunar apsides to their symbols.
 * Nodes mark lunar orbit crossings with the ecliptic; apsides mark near/far points from Earth.
 */
export const symbolByNode = {
  "lunar apogee": "🌚",
  "lunar perigee": "🌝",
  "north lunar node": "☊",
  "south lunar node": "☋",
} as const;

// 🔭 Bodies

/**
 * Complete mapping of all celestial bodies to their symbols.
 * Combines planets, asteroids, and lunar nodes.
 */
export const symbolByBody = {
  ...symbolByPlanet,
  ...symbolByAsteroid,
  ...symbolByNode,
} as const;

// 🧭 Aspects

// 📐 Major Aspects

/**
 * Maps each of the five Ptolemaic aspects to its Unicode symbol.
 * These are the classical aspects used since ancient times.
 */
export const symbolByMajorAspect = {
  conjunct: "☌",
  opposite: "☍",
  sextile: "⚹",
  square: "□",
  trine: "△",
} as const;

// 🖇️ Minor Aspects

/**
 * Maps each minor aspect to its Unicode symbol.
 * Minor aspects are used in modern psychological astrology.
 */
export const symbolByMinorAspect = {
  quincunx: "⚻",
  semisextile: "⚺",
  semisquare: "∠",
  sesquiquadrate: "⚼",
} as const;

// 🧮 Specialty Aspects

/**
 * Maps each harmonic aspect to its symbol.
 * Based on harmonic divisions (5ths, 7ths, 9ths) of the zodiac circle.
 */
export const symbolBySpecialtyAspect = {
  biquintile: "±",
  decile: "⊥",
  novile: "N",
  quintile: "⬠",
  septile: "S",
  tredecile: "∓",
  undecile: "U",
} as const;

// 🔺 Triple Aspects

/**
 * Maps three-planet aspect patterns to their symbols.
 * Includes T-square, grand trine, yod (finger of God), and hammer patterns.
 */
export const symbolByTripleAspect = {
  "grand trine": "△",
  hammer: "🔨",
  "t-square": "⊤",
  yod: "⚛",
} as const;

// ✖️ Quadruple Aspects

/**
 * Maps four-planet aspect patterns to their symbols.
 * Includes grand cross, kite, mystic rectangle, and other complex configurations.
 */
export const symbolByQuadrupleAspect = {
  boomerang: "🪃",
  butterfly: "🦋",
  cradle: "🛏",
  "grand cross": "➕",
  hourglass: "⏳",
  kite: "🪁",
  "mystic rectangle": "🚪",
} as const;

// ⭐ Quintuple Aspects

/**
 * Maps five-planet aspect patterns to their symbols.
 * The pentagram configuration forms a five-pointed star.
 */
export const symbolByQuintupleAspect = {
  pentagram: "⭐",
} as const;

// 🔯 Sextuple Aspects

/**
 * Maps six-planet aspect patterns to their symbols.
 * The hexagram configuration forms a six-pointed star.
 */
export const symbolBySextupleAspect = {
  hexagram: "🔯",
} as const;

// ✨ Stellium

/**
 * Maps stellium configurations to their emoji symbols.
 * Stelliums are clusters of 3+ planets in the same sign or house.
 * Symbol brightness increases with the number of planets involved.
 */
export const symbolByStellium = {
  "decuple stellium": "☀️",
  "duodecuple stellium": "🔥",
  "nonuple stellium": "🔆",
  "octuple stellium": "✴️",
  "quadruple stellium": "🌟",
  "quintuple stellium": "⭐",
  "septuple stellium": "🌠",
  "sextuple stellium": "💫",
  "triple stellium": "✨",
  "undecuple stellium": "🌞",
} as const;

// 🔁 Orbital Directions

/**
 * Maps orbital motion directions to their emoji symbols.
 * Retrograde indicates apparent backward motion from Earth's perspective.
 */
export const symbolByOrbitalDirection = {
  direct: "↪️",
  prograde: "↪️",
  retrograde: "↩️",
} as const;

// ⏫ Planetary Directions

// export const symbolByPlanetaryDirection = {
//   rise: "🔼",
//   ascendant: "🔼",

//   zenith: "⏫",
//   "medium coeli": "⏫",
//   culmination: "⏫",

//   set: "🔽",
//   descendant: "🔽",

//   nadir: "⏬",
//   "imum coeli": "⏬",
//   declination: "⏬",
// } as const;

// 🧭 Directions

// export const symbolByDirection = {
//   ...symbolByOrbitalDirection,
//   ...symbolByPlanetaryDirection,
// };

// 🌐 Positions

// export const symbolByApsis = {
//   perihelion: "🔥",
//   aphelion: "❄️",
//   perigee: "🔥",
//   apogee: "❄️",
//   periapsis: "🔥",
//   apoapsis: "❄️",
// } as const;

// export const symbolByPosition = {
//   ...symbolByApsis,
//   "vernal equinox": "🌸",
//   beltane: "🌼",
//   "summer solstice": "🌞",
//   lammas: "🌾",
//   "autumn equinox": "🍂",
//   samhain: "🎃",
//   "winter solstice": "☃️",
//   imbolc: "🐑",
// } as const;

// 🌓 Phases

/**
 * Maps lunar phases to their emoji representations.
 * Ordered from new moon through the synodic month back to new moon.
 */
export const symbolByLunarPhase = {
  "first quarter": "🌓",
  full: "🌕",
  "last quarter": "🌗",
  new: "🌑",
  "waning crescent": "🌘",
  "waning gibbous": "🌖",
  "waxing crescent": "🌒",
  "waxing gibbous": "🌔",
} as const;

// ♀️ Venusian Phases

/**
 * Maps Venus's phases and synodic cycle events to their emoji combinations.
 * Tracks Venus as morning/evening star with stations, elongations, and brightest points.
 */
export const symbolByVenusianPhase = {
  "inferior conjunction": "🌑☌",
  new: "🌑",

  "morning rise": "🌄↥",
  "morning set": "🌄↧",
  "morning station": "🌄⏹️",
  "western brightest": "🔆",
  "western elongation": "⬅️📏",

  full: "🌕",
  "superior conjunction": "🌕☌",

  "eastern brightest": "🔆",
  "eastern elongation": "📏➡️",
  "evening rise": "🌇↥",
  "evening set": "🌇↧",
  "evening station": "🌇⏹️",
} as const;

// ☿️ Mercurian Phases

/**
 * Maps Mercury's phases and synodic cycle events to their emoji combinations.
 * Includes Promethean (morning) and Epimethean (evening) conjunctions in Hellenistic tradition.
 */
export const symbolByMercurianPhase = {
  "inferior conjunction": "🌑☌",
  new: "🌑",
  "promethian conjunction": "🌑☌",

  "morning rise": "🌄↥",
  "morning set": "🌄↧",
  "western brightest": "🔆",
  "western elongation": "⬅️📏",

  "epimethian conjunction": "🌕☌",
  full: "🌕",
  "superior conjunction": "🌕☌",

  "eastern brightest": "🔆",
  "eastern elongation": "📏➡️",
  "evening rise": "🌇↥",
  "evening set": "🌇↧",
} as const;

// ♂️ Martian Phases

/**
 * Maps Mars's phases and synodic cycle events to their emoji combinations.
 * Tracks visibility as morning/evening star with retrograde stations.
 */
export const symbolByMartianPhase = {
  conjunction: "🌑☌",
  "morning star": "🌄🌟",
  new: "🌑",

  "morning first": "🌄🌖",
  "morning rise": "🌄↥",
  "morning set": "🌄↧",
  "morning station": "🌄⏹️",

  "evening star": "🌇🌟",
  full: "🌕",
  opposition: "🌕☍",

  brightest: "🌟",

  "evening last": "🌇🌘",
  "evening rise": "🌇↥",
  "evening set": "🌇↧",
  "evening station": "🌇⏹️",
} as const;
