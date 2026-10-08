// ♟️ Constants

import type {
  ManualDeletionLexeme,
  ManualPraenomenAbbreviation,
} from "./manual.types";

export const MANUAL_LEXEMES_TO_DELETE: readonly ManualDeletionLexeme[] = [
  { disambiguator: 0, lemma: "qui" },
  { disambiguator: 0, lemma: "quis" },
  { disambiguator: 0, lemma: "latinitas" },
  { disambiguator: 0, lemma: "ille" },
  { disambiguator: 1, lemma: "ille" },
  { disambiguator: 0, lemma: "omnis" },
];

const CAESO_ABBREVIATION = "k";
const MINO_ABBREVIATION = "min";

export const PRAENOMEN_ABBREVIATIONS: Readonly<
  Record<string, ManualPraenomenAbbreviation>
> = {
  a: { feminine: "aula", masculine: "aulus" },
  agr: { masculine: "agrippa" },
  ap: { feminine: "appia", masculine: "appius" },
  c: { feminine: "gaia", masculine: "gaius" },
  [CAESO_ABBREVIATION]: { masculine: "caeso" },
  d: { feminine: "decima", masculine: "decimo" },
  f: { feminine: "fausta", masculine: "faustus" },
  gn: { feminine: "gnaea", masculine: "gnaeus" },
  h: { feminine: "hosta" },
  l: { feminine: "lucia", masculine: "lucius" },
  m: { feminine: "marcia", masculine: "marcus" },
  "m'": { feminine: "mania", masculine: "manius" },
  mai: { feminine: "maio" },
  mam: { feminine: "mamerca", masculine: "mamercus" },
  [MINO_ABBREVIATION]: { feminine: "mino" },
  n: { feminine: "numeria", masculine: "numerius" },
  o: { masculine: "octavius" },
  oct: { feminine: "octavia" },
  opet: { masculine: "opiter" },
  p: { masculine: "publius" },
  post: { feminine: "postuma", masculine: "postumus" },
  pro: { feminine: "procula", masculine: "proculus" },
  q: { feminine: "quinta", masculine: "quintus" },
  s: { masculine: "spurius" },
  sec: { feminine: "secunda" },
  seq: { feminine: "secunda" },
  ser: { feminine: "servia", masculine: "servius" },
  sert: { masculine: "sertor" },
  sex: { feminine: "sexta", masculine: "sextus" },
  sp: { feminine: "spuria" },
  st: { feminine: "statia", masculine: "statius" },
  t: { feminine: "titia", masculine: "titus" },
  ti: { feminine: "tiberia", masculine: "tiberius" },
  v: { feminine: "vibia", masculine: "vibius" },
  vol: { feminine: "volusa", masculine: "volesus" },
  vop: { feminine: "vopisca", masculine: "vopiscus" },
};
