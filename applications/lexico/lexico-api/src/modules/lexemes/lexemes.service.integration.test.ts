/* cspell:words puella */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  Lexeme,
  NominalForm,
  NounInflection,
  PrincipalPart,
  Pronunciation,
  Translation,
} from "@codebase/lexico-entities";

import {
  DATABASE_TIMEOUT_MILLISECONDS,
  startLexicoDatabaseTestingModule,
} from "../../../testing/database";

import { LexemesService } from "./lexemes.service";

import type { DatabaseTestingModule } from "@codebase/database/testing";
import type { Repository } from "typeorm";

const UNKNOWN_LEXEME_ID = "00000000-0000-7000-8000-000000000000";

/** Builds a noun with one of every relation a lexeme lookup eager-loads. */
function createNoun(lemma: string, meaning: string): Lexeme {
  const lexeme = new Lexeme();
  lexeme.lemma = lemma;
  lexeme.partOfSpeech = "noun";

  const form = new NominalForm();
  form.case = "nominative";
  form.number = "singular";
  lexeme.forms = [form];

  const inflection = new NounInflection();
  inflection.declension = "first";
  inflection.gender = "feminine";
  lexeme.inflection = inflection;

  const principalPart = new PrincipalPart();
  principalPart.name = "nominative";
  principalPart.text = [lemma];
  lexeme.principalParts = [principalPart];

  const pronunciation = new Pronunciation();
  pronunciation.variant = "classical";
  pronunciation.phonemic = `/${lemma}/`;
  lexeme.pronunciations = [pronunciation];

  lexeme.translations = [new Translation(meaning, lexeme)];

  return lexeme;
}

describe("lexemes service integration suite", () => {
  let database: DatabaseTestingModule;
  let service: LexemesService;
  let puella: Lexeme;
  let rosa: Lexeme;

  beforeAll(async () => {
    database = await startLexicoDatabaseTestingModule([Lexeme]);

    const lexemes: Repository<Lexeme> = database.repository(Lexeme);
    service = new LexemesService(lexemes);

    puella = await lexemes.save(createNoun("puella", "girl, maiden"));
    rosa = await lexemes.save(createNoun("rosa", "rose"));
  }, DATABASE_TIMEOUT_MILLISECONDS);

  afterAll(async () => {
    await database.close();
  }, DATABASE_TIMEOUT_MILLISECONDS);

  it("integrates single lexeme lookup eager-loading all relations", async () => {
    expect.hasAssertions();

    const result = await service.findById(puella.id);

    expect(result?.lemma).toBe("puella");
    expect(result?.forms).toHaveLength(1);
    expect(result?.forms[0]).toBeInstanceOf(NominalForm);
    expect(result?.inflection).toBeInstanceOf(NounInflection);
    expect(result?.principalParts.map((part) => part.text)).toStrictEqual([
      ["puella"],
    ]);
    expect(result?.pronunciations?.map((entry) => entry.variant)).toStrictEqual(
      ["classical"],
    );
    expect(result?.translations?.map((entry) => entry.data)).toStrictEqual([
      "girl, maiden",
    ]);
  });

  it("assigns every saved lexeme a uuidv7 id in the database", () => {
    expect.hasAssertions();
    expect(puella.id).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    );
  });

  it("returns null for an id no lexeme has", async () => {
    expect.hasAssertions();
    await expect(service.findById(UNKNOWN_LEXEME_ID)).resolves.toBeNull();
  });

  it("integrates batch lexemes lookup eager-loading relations for multiple IDs", async () => {
    expect.hasAssertions();

    const result = await service.findByIds([
      puella.id,
      rosa.id,
      UNKNOWN_LEXEME_ID,
    ]);

    expect(result.map((lexeme) => lexeme.lemma).toSorted()).toStrictEqual([
      "puella",
      "rosa",
    ]);
    expect(result.every((lexeme) => lexeme.translations?.length === 1)).toBe(
      true,
    );
  });

  it("skips the database for an empty batch", async () => {
    expect.hasAssertions();
    await expect(service.findByIds([])).resolves.toStrictEqual([]);
  });
});
