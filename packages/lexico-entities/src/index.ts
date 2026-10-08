export { AdjectivalForm } from "./modules/entities/dictionary/form/AdjectivalForm.entity";
export { AdverbForm } from "./modules/entities/dictionary/form/AdverbForm.entity";
export { FiniteVerbForm } from "./modules/entities/dictionary/form/FiniteVerbForm.entity";
export { Form } from "./modules/entities/dictionary/form/Form.entity";
export { GerundForm } from "./modules/entities/dictionary/form/GerundForm.entity";
export { InfinitiveForm } from "./modules/entities/dictionary/form/InfinitiveForm.entity";
export { NominalForm } from "./modules/entities/dictionary/form/NominalForm.entity";
export { ParticipleForm } from "./modules/entities/dictionary/form/ParticipleForm.entity";
export { SupineForm } from "./modules/entities/dictionary/form/SupineForm.entity";
export { AdjectiveInflection } from "./modules/entities/dictionary/inflection/AdjectiveInflection.entity";
export { AdverbInflection } from "./modules/entities/dictionary/inflection/AdverbInflection.entity";
export { Inflection } from "./modules/entities/dictionary/inflection/Inflection.entity";
export { NounInflection } from "./modules/entities/dictionary/inflection/NounInflection.entity";
export { PrepositionInflection } from "./modules/entities/dictionary/inflection/PrepositionInflection.entity";
export { UninflectedInflection } from "./modules/entities/dictionary/inflection/Uninflected.entity";
export { VerbInflection } from "./modules/entities/dictionary/inflection/VerbInflection.entity";
export { Lexeme } from "./modules/entities/dictionary/Lexeme.entity";
export type { PartOfSpeech } from "./modules/entities/dictionary/PartOfSpeech.entity";
export { partsOfSpeech as partOfSpeechEnumValues } from "./modules/entities/dictionary/PartOfSpeech.entity";
export { PrincipalPart } from "./modules/entities/dictionary/PrincipalPart.entity";
export {
  Pronunciation,
  pronunciationVariants as pronunciationVariantValues,
} from "./modules/entities/dictionary/Pronunciation.entity";
export type { PronunciationVariant } from "./modules/entities/dictionary/Pronunciation.entity";
export { Translation } from "./modules/entities/dictionary/Translation.entity";
export { Word } from "./modules/entities/dictionary/Word.entity";
export { WordForm } from "./modules/entities/dictionary/WordForm.entity";
export { WordLexeme } from "./modules/entities/dictionary/WordLexeme.entity";
export { EntitiesModule } from "./modules/entities/entities.module";
export { Author } from "./modules/entities/literature/Author.entity";
export { Line } from "./modules/entities/literature/Line.entity";
export { Text } from "./modules/entities/literature/Text.entity";
export { Token } from "./modules/entities/literature/Token.entity";
export { LEXICO_DATABASE_MIGRATIONS } from "./modules/lexico-database/data-source.constants";
export {
  adjectiveDeclensionValues,
  adjectiveDegreeValues,
  adverbDegrees as adverbDegreeValues,
  adverbTypes as adverbFunctionTypeValues,
  formCaseValues,
  formDegreeValues,
  formGenderValues,
  formGerundCaseValues,
  formMoodValues,
  formNonFiniteTenseValues,
  formNumberValues,
  formPersonValues,
  formSupineCaseValues,
  formTenseValues,
  formVoiceValues,
  inflectionDeclensionValues,
  LexicoNamingStrategy,
  nounDeclensionValues,
  nounGenders,
  prepositionCases,
  verbConjugationValues,
} from "./modules/lexico-database/lexico-database.constants";
export type {
  AdjectiveDeclension,
  AdjectiveDegree,
  AdverbDegree,
  AdverbType as AdverbFunctionType,
  FormCase,
  FormDegree,
  FormGender,
  FormGerundCase,
  FormMood,
  FormNonFiniteTense,
  FormNumber,
  FormPerson,
  FormSupineCase,
  FormTense,
  FormVoice,
  NounDeclension,
  NounGender,
  PrepositionCase,
  VerbConjugation,
} from "./modules/lexico-database/lexico-database.constants";
export { LexicoDatabaseModule } from "./modules/lexico-database/lexico-database.module";
export { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
export { DataSource, In, Repository } from "typeorm";
