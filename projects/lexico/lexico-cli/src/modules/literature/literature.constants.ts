// ♟️ Constants

export const DEFAULT_TEXT_CHUNK_SIZE = 5;

export const authorIdToName: Record<string, string> = {
  ammianus: "ammianus marcellinus",
  apuleius: "lucius apuleius madaurensis",
  augustus: "caesar divi filius augustus",
  "aurelius-victor": "sextus aurelius victor",
  caesar: "gaius iulius caesar",
  cato: "marcus porcius cato censor",
  catullus: "gaius valerius catullus",
  cicero: "marcus tullius cicero",
  claudian: "claudius claudianus",
  "curtius-rufus": "quintus curtius rufus",
  ennius: "quintus ennius",
  eutropius: "eutropius",
  florus: "florus",
  frontinus: "sextus iulius frontinus",
  gellius: "aulus gellius",
  "historia-augusta": "scriptores historiae augustae",
  horace: "quintus horacius flaccus",
  justin: "marcus iunianus iustinus",
  juvenal: "decimus iunius iuvenalis",
  livy: "titus livius",
  lucan: "marcus annaeus lucanus",
  lucretius: "titus lucretius carus",
  martial: "marcus valerius martialis",
  nepos: "cornelius nepos",
  ovid: "publius ovidius naso",
  persius: "aulus persius flaccus",
  petronius: "gaius petronius",
  phaedrus: "phaedrus",
  plautus: "titus maccius plautus",
  "pliny-maior": "gaius plinius secundus",
  "pliny-minor": "gaius plinius caecilius secundus",
  propertius: "sextus propertius",
  quintilian: "marcus fabius quiintilianus",
  "roman-law": "ius romanum",
  sallust: "gaius sallustius crispus",
  "seneca-maior": "lucius annaeus seneca maior",
  "seneca-minor": "lucius annaeus seneca",
  "silius-italicus": "silius italicus",
  statius: "publius papinius statius",
  suetonius: "gaius suetonius tranquillus",
  sulpicia: "sulpicia",
  tacitus: "publius cornelius tacitus",
  terence: "publius terentius afer",
  tibullus: "albius tibullus",
  "valerius-flaccus": "gaius valereius flaccus",
  "valerius-maximus": "valerius maximus",
  varro: "marcus terentius varro",
  vellius: "gaius velleius patereculus",
  virgil: "publius vergilius maro",
  vitruvius: "marcus vitruvius pollio",
  "vulgate-bible-new-testament": "biblia sacra vulgata testamentum novum",
  "vulgate-bible-old-testament": "biblia sacra vulgata testamentum vetum",
};

export const DEFAULT_LINE_CHUNK_SIZE = 1000;

export const DEFAULT_TOKEN_CHUNK_SIZE = 2000;

export const LABEL_PATTERN = /^([IVXLCDM]+|[0-9]+[a-zA-Z]*)\.?\s*(.*)$/i;

export const ROMAN_NUMERAL_PATTERN = /^[IVXLCDM]+$/i;

export const LEADING_WHITESPACE_PATTERN = /^\s+/;

export const CAPITAL_LETTER_PATTERN = /[A-Z]/g;

export const TOKEN_SEGMENT_PATTERN = /[\p{L}]+|[^\p{L}\s]+/gu;

export const WORD_TOKEN_PATTERN = /^[\p{L}]+$/u;

export const COMBINING_MARKS_PATTERN = /[\u0300-\u036F]/gu;
