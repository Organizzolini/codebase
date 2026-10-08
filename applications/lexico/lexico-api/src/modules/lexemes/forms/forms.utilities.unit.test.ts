import { describe, expect, it } from "vitest";

import {
  AdjectivalForm,
  AdverbForm,
  FiniteVerbForm,
  Form,
  GerundForm,
  InfinitiveForm,
  Lexeme,
  NominalForm,
  ParticipleForm,
  SupineForm,
} from "@codebase/lexico-entities";

import { AdjectivalFormType } from "./adjectival-form.entities";
import { AdverbFormType } from "./adverb-form.entities";
import { FiniteVerbFormType } from "./finite-verb-form.entities";
import { toFormType } from "./forms.utilities";
import { GerundFormType } from "./gerund-form.entities";
import { InfinitiveFormType } from "./infinitive-form.entities";
import { NominalFormType } from "./nominal-form.entities";
import { ParticipleFormType } from "./participle-form.entities";
import { SupineFormType } from "./supine-form.entities";

/** Gives a form entity an id, an audit trail, and its lexeme join. */
function withDatabaseColumns<Entity extends Form>(form: Entity): Entity {
  return Object.assign(form, {
    createdAt: new Date("2025-01-01T00:00:00Z"),
    createdBy: "ingestion",
    id: "form-1",
    lexeme: new Lexeme(),
    updatedAt: new Date("2025-01-02T00:00:00Z"),
    wordForms: [],
  });
}

describe(toFormType, () => {
  it.each([
    {
      expected: { case: "accusative", number: "plural" },
      form: Object.assign(new NominalForm(), {
        case: "accusative",
        number: "plural",
      }),
      type: NominalFormType,
    },
    {
      expected: { case: "dative", gender: "neuter", number: "singular" },
      form: Object.assign(new AdjectivalForm(), {
        case: "dative",
        gender: "neuter",
        number: "singular",
      }),
      type: AdjectivalFormType,
    },
    {
      expected: {
        mood: "subjunctive",
        number: "plural",
        person: "second",
        tense: "imperfect",
        voice: "passive",
      },
      form: Object.assign(new FiniteVerbForm(), {
        mood: "subjunctive",
        number: "plural",
        person: "second",
        tense: "imperfect",
        voice: "passive",
      }),
      type: FiniteVerbFormType,
    },
    {
      expected: { tense: "perfect", voice: "passive" },
      form: Object.assign(new ParticipleForm(), {
        tense: "perfect",
        voice: "passive",
      }),
      type: ParticipleFormType,
    },
    {
      expected: { tense: "present", voice: "active" },
      form: Object.assign(new InfinitiveForm(), {
        tense: "present",
        voice: "active",
      }),
      type: InfinitiveFormType,
    },
    {
      expected: { case: "genitive" },
      form: Object.assign(new GerundForm(), { case: "genitive" }),
      type: GerundFormType,
    },
    {
      expected: { case: "ablative" },
      form: Object.assign(new SupineForm(), { case: "ablative" }),
      type: SupineFormType,
    },
    {
      expected: { degree: "superlative" },
      form: Object.assign(new AdverbForm(), { degree: "superlative" }),
      type: AdverbFormType,
    },
  ])(
    "maps a $type.name with its own fields and no database column",
    ({ expected, form, type }) => {
      expect.hasAssertions();

      const mapped = toFormType(withDatabaseColumns(form));

      expect(mapped).toBeInstanceOf(type);
      expect(mapped).toStrictEqual(
        Object.assign(new type(), { ...expected, id: "form-1" }),
      );
    },
  );

  it("refuses a form of no known kind rather than return an unresolvable type", () => {
    expect.hasAssertions();

    expect(() => toFormType(withDatabaseColumns(new Form()))).toThrow(
      "Form form-1 has no GraphQL type for its class Form",
    );
  });
});
