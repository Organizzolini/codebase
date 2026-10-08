/* cspell:words rosae rosarum */

import {
  FiniteVerbForm,
  type Form,
  type Inflection,
  Lexeme,
  NominalForm,
  NounInflection,
  type PartOfSpeech,
  Translation,
  Word,
  WordForm,
  WordLexeme,
} from "@codebase/lexico-entities";

import type { ObjectLiteral, Repository } from "typeorm";

/** Hands back the repository for one entity, as the test database does. */
export type RepositoryOf = <Entity extends ObjectLiteral>(
  entity: abstract new (...constructorArguments: never[]) => Entity,
) => Repository<Entity>;

/** The rows a word lookup reads, seeded once per suite. */
export interface SeededWordLookups {
  /** A word surfaced only by a soft-deleted row. */
  readonly deleted: Word;
  /** "edo", to eat: one of the two lexemes "est" can represent. */
  readonly edo: Lexeme;
  /** "est": one surface word shared by two lexemes. */
  readonly est: Word;
  /** "rosa", a first-declension noun with three forms spelled "rosae". */
  readonly rosa: Lexeme;
  /** "rosae": one surface word for three forms of the same lexeme. */
  readonly rosae: Word;
  /** "sum", to be: the other lexeme "est" can represent. */
  readonly sum: Lexeme;
}

/**
 * Seeds the words a lookup has to tell apart: "rosae", one word for three
 * forms of one noun; "est", one word shared by two verbs; and "rosarum",
 * linked like any other word and then soft-deleted.
 */
export async function seedWordLookups(
  repository: RepositoryOf,
): Promise<SeededWordLookups> {
  const rosaForms = [
    createNominalForm("genitive", "singular"),
    createNominalForm("dative", "singular"),
    createNominalForm("nominative", "plural"),
  ];
  const inflection = new NounInflection();
  inflection.declension = "first";
  inflection.gender = "feminine";
  const genitivePlural = createNominalForm("genitive", "plural");
  const rosa = await seedLexeme(repository, {
    forms: [...rosaForms, genitivePlural],
    inflection,
    lemma: "rosa",
    meaning: "rose",
    partOfSpeech: "noun",
  });

  const sumForm = createThirdPersonSingular();
  const sum = await seedLexeme(repository, {
    forms: [sumForm],
    lemma: "sum",
    meaning: "to be",
    partOfSpeech: "verb",
  });
  const edoForm = createThirdPersonSingular();
  const edo = await seedLexeme(repository, {
    forms: [edoForm],
    lemma: "edo",
    meaning: "to eat",
    partOfSpeech: "verb",
  });

  const rosae = await seedWord(repository, "rosae", {
    forms: rosaForms,
    lexemes: [rosa],
  });
  const est = await seedWord(repository, "est", {
    forms: [sumForm, edoForm],
    lexemes: [sum, edo],
  });
  const deleted = await seedWord(repository, "rosarum", {
    forms: [genitivePlural],
    lexemes: [rosa],
  });
  await repository(Word).softRemove(deleted);

  return { deleted, edo, est, rosa, rosae, sum };
}

/** Builds a nominal form for the given case and number. */
function createNominalForm(
  case_: NominalForm["case"],
  number: NominalForm["number"],
): NominalForm {
  const form = new NominalForm();
  form.case = case_;
  form.number = number;
  return form;
}

/** Builds the third-person singular present indicative active form. */
function createThirdPersonSingular(): FiniteVerbForm {
  const form = new FiniteVerbForm();
  form.mood = "indicative";
  form.number = "singular";
  form.person = "third";
  form.tense = "present";
  form.voice = "active";
  return form;
}

/** Saves a lexeme with its forms and translations, cascading both. */
async function seedLexeme(
  repository: RepositoryOf,
  seed: {
    readonly forms: Form[];
    readonly inflection?: Inflection;
    readonly lemma: string;
    readonly meaning: string;
    readonly partOfSpeech: PartOfSpeech;
  },
): Promise<Lexeme> {
  const lexeme = new Lexeme();
  lexeme.lemma = seed.lemma;
  lexeme.partOfSpeech = seed.partOfSpeech;
  lexeme.forms = seed.forms;
  if (seed.inflection !== undefined) {
    lexeme.inflection = seed.inflection;
  }
  lexeme.translations = [new Translation(seed.meaning, lexeme)];
  return repository(Lexeme).save(lexeme);
}

/** Saves a surface word linked to each form and each lexeme given. */
async function seedWord(
  repository: RepositoryOf,
  data: string,
  links: { readonly forms: Form[]; readonly lexemes: Lexeme[] },
): Promise<Word> {
  const word = new Word();
  word.data = data;
  const saved = await repository(Word).save(word);

  await repository(WordForm).save(
    links.forms.map((form) => {
      const wordForm = new WordForm();
      wordForm.form = form;
      wordForm.word = saved;
      return wordForm;
    }),
  );
  await repository(WordLexeme).save(
    links.lexemes.map((lexeme) => {
      const wordLexeme = new WordLexeme();
      wordLexeme.lexeme = lexeme;
      wordLexeme.word = saved;
      return wordLexeme;
    }),
  );

  return saved;
}
