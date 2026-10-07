import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates and drops lexico's initial schema in `lexico`, generated from the
 * entities against an empty `lexico_development`.
 */
export class Migration1791164926316 implements MigrationInterface {
  name = "Migration1791164926316";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "lexico"."forms_form_case_enum" AS ENUM('ablative', 'accusative', 'dative', 'genitive', 'locative', 'nominative', 'vocative')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."forms_gender_enum" AS ENUM('feminine', 'masculine', 'neuter')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."forms_number_enum" AS ENUM('plural', 'singular')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."forms_degree_enum" AS ENUM('comparative', 'positive', 'superlative')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."forms_mood_enum" AS ENUM('imperative', 'indicative', 'subjunctive')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."forms_person_enum" AS ENUM('first', 'second', 'third')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."forms_tense_enum" AS ENUM('future', 'futurePerfect', 'imperfect', 'perfect', 'pluperfect', 'present')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."forms_voice_enum" AS ENUM('active', 'passive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."forms" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "form_case" "lexico"."forms_form_case_enum", "gender" "lexico"."forms_gender_enum", "number" "lexico"."forms_number_enum", "degree" "lexico"."forms_degree_enum", "mood" "lexico"."forms_mood_enum", "person" "lexico"."forms_person_enum", "tense" "lexico"."forms_tense_enum", "voice" "lexico"."forms_voice_enum", "type" text NOT NULL, "lexeme_id" uuid NOT NULL, CONSTRAINT "PK_ba062fd30b06814a60756f233da" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."forms"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."forms"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexico"."forms"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexico"."forms"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexico"."forms"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexico"."forms"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexico"."forms"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexico"."forms"."form_case" IS 'Grammatical case of this form'; COMMENT ON COLUMN "lexico"."forms"."gender" IS 'Grammatical gender of this adjectival form'; COMMENT ON COLUMN "lexico"."forms"."number" IS 'Grammatical number (singular or plural)'; COMMENT ON COLUMN "lexico"."forms"."degree" IS 'Degree of comparison (positive, comparative, superlative)'; COMMENT ON COLUMN "lexico"."forms"."mood" IS 'Grammatical mood (indicative, subjunctive, imperative)'; COMMENT ON COLUMN "lexico"."forms"."person" IS 'Grammatical person (first, second, third)'; COMMENT ON COLUMN "lexico"."forms"."tense" IS 'Grammatical tense'; COMMENT ON COLUMN "lexico"."forms"."voice" IS 'Grammatical voice (active or passive)'; COMMENT ON COLUMN "lexico"."forms"."lexeme_id" IS 'Primary key, a uuidv7 the database assigns on insert'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_52ebb86789cf513c7fb44ab9a9" ON "lexico"."forms"  ("lexeme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2bc463838022e5cc652df63c4a" ON "lexico"."forms"  ("type") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."forms" IS 'Abstract base table for normalized inflected forms using single-table inheritance'`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."inflections_declension_enum" AS ENUM('fifth', 'first', 'fourth', '', 'second', 'third', 'first/second')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."inflections_degree_enum" AS ENUM('comparative', 'positive', 'superlative')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."inflections_adverb_type_enum" AS ENUM('conjunctional', 'descriptive', '')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."inflections_gender_enum" AS ENUM('feminine', 'masc/fem', 'masculine', 'neuter', '')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."inflections_case_enum" AS ENUM('ablative', 'accusative', '')`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."inflections_conjugation_enum" AS ENUM('first', 'fourth', '', 'second', 'third', 'third-io')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."inflections" ("id" uuid NOT NULL DEFAULT uuidv7(), "declension" "lexico"."inflections_declension_enum" DEFAULT '', "degree" "lexico"."inflections_degree_enum" DEFAULT 'positive', "adverb_type" "lexico"."inflections_adverb_type_enum" DEFAULT '', "gender" "lexico"."inflections_gender_enum" DEFAULT '', "case" "lexico"."inflections_case_enum" DEFAULT '', "other" text, "conjugation" "lexico"."inflections_conjugation_enum" DEFAULT '', "type" text NOT NULL, "lexeme_id" uuid, CONSTRAINT "REL_ebe1d473505c1ffc72c57d5773" UNIQUE ("lexeme_id"), CONSTRAINT "PK_a70d36c564be34be3f08a08bc0b" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."inflections"."id" IS 'Primary key, a uuidv7 the database assigns on insert; discriminator column ''type'' selects the child entity'; COMMENT ON COLUMN "lexico"."inflections"."declension" IS 'Adjective declension class (first/second or third)'; COMMENT ON COLUMN "lexico"."inflections"."degree" IS 'Degree of comparison (positive, comparative, superlative)'; COMMENT ON COLUMN "lexico"."inflections"."adverb_type" IS 'Functional type of the adverb (descriptive or conjunctional)'; COMMENT ON COLUMN "lexico"."inflections"."gender" IS 'Grammatical gender (masculine, feminine, neuter)'; COMMENT ON COLUMN "lexico"."inflections"."case" IS 'Grammatical case governed by the preposition (accusative or ablative)'; COMMENT ON COLUMN "lexico"."inflections"."other" IS 'Additional inflection notes'; COMMENT ON COLUMN "lexico"."inflections"."conjugation" IS 'Verb conjugation class (first through fourth)'; COMMENT ON COLUMN "lexico"."inflections"."lexeme_id" IS 'Primary key, a uuidv7 the database assigns on insert'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2f191c1029749f9f01b877e7f8" ON "lexico"."inflections"  ("type") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."inflections" IS 'Abstract base table for grammatical inflection metadata using single-table inheritance'`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."principal_parts" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "name" text NOT NULL, "text" jsonb NOT NULL, "lexeme_id" uuid, CONSTRAINT "PK_a7efc0b33c62679b3302fe95f8d" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."principal_parts"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."principal_parts"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexico"."principal_parts"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexico"."principal_parts"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexico"."principal_parts"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexico"."principal_parts"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexico"."principal_parts"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexico"."principal_parts"."name" IS 'Label for the principal part (e.g. first, infinitive)'; COMMENT ON COLUMN "lexico"."principal_parts"."text" IS 'One or more textual forms for this principal part'; COMMENT ON COLUMN "lexico"."principal_parts"."lexeme_id" IS 'Primary key, a uuidv7 the database assigns on insert'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_95d23e3a9561dea102f7bf9325" ON "lexico"."principal_parts"  ("lexeme_id") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."principal_parts" IS 'A named principal part (e.g. first, infinitive) of a Latin dictionary entry'`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."pronunciations_variant_enum" AS ENUM('classical', 'ecclesiastical', 'vulgar')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."pronunciations" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "phonemes" text, "phonemic" text, "phonetic" text, "variant" "lexico"."pronunciations_variant_enum" NOT NULL, "lexeme_id" uuid, CONSTRAINT "UQ_a90eaf47f480c0d14365fdd34b1" UNIQUE ("lexeme_id", "variant"), CONSTRAINT "PK_fb90cb28dd8dcce6ee8d677d067" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."pronunciations"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."pronunciations"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexico"."pronunciations"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexico"."pronunciations"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexico"."pronunciations"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexico"."pronunciations"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexico"."pronunciations"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexico"."pronunciations"."phonemes" IS 'Phonemic segmentation (e.g. a.moː)'; COMMENT ON COLUMN "lexico"."pronunciations"."phonemic" IS 'Phonemic IPA transcription (e.g. /ˈaː.moː/)'; COMMENT ON COLUMN "lexico"."pronunciations"."phonetic" IS 'Phonetic IPA transcription (e.g. [ˈäː.moː])'; COMMENT ON COLUMN "lexico"."pronunciations"."variant" IS 'Pronunciation tradition (classical, ecclesiastical, or vulgar)'; COMMENT ON COLUMN "lexico"."pronunciations"."lexeme_id" IS 'Primary key, a uuidv7 the database assigns on insert'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ccf78e53911b7c121a65192c89" ON "lexico"."pronunciations"  ("lexeme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8de57efb4c40b209b2883c3d8c" ON "lexico"."pronunciations"  ("phonemes") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8fc53b1cbb6c5683b37f65a328" ON "lexico"."pronunciations"  ("phonemic") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_81c176364b794cdcdf309a7a60" ON "lexico"."pronunciations"  ("variant") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."pronunciations" IS 'A pronunciation variant (classical, ecclesiastical, or vulgar) for a Latin lexeme'`,
    );
    // 🎯 TypeORM creates its metadata table only when it synchronizes, so a
    // generated migration must create it, and records a generated column under
    // `current_schema()` and the generating database. Record it under the
    // schema it lives in and whichever database the migration runs against.
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "lexico"."typeorm_metadata" ("type" character varying NOT NULL, "database" character varying, "schema" character varying, "table" character varying, "name" character varying, "value" text)`,
    );
    await queryRunner.query(
      `INSERT INTO "lexico"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (current_database(), $1, $2, $3, $4, $5)`,
      [
        "lexico",
        "translations",
        "GENERATED_COLUMN",
        "translation_full_text_search",
        "to_tsvector('english', data)",
      ],
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."translations" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "data" text NOT NULL, "translation_full_text_search" tsvector GENERATED ALWAYS AS (to_tsvector('english', data)) STORED, "lexeme_id" uuid, CONSTRAINT "PK_aca248c72ae1fb2390f1bf4cd87" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."translations"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."translations"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexico"."translations"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexico"."translations"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexico"."translations"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexico"."translations"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexico"."translations"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexico"."translations"."data" IS 'English translation text'; COMMENT ON COLUMN "lexico"."translations"."lexeme_id" IS 'Primary key, a uuidv7 the database assigns on insert'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_39313ab7fdf2f551cde7ef9611" ON "lexico"."translations"  ("data") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_03033925e968b7c9430896d55f" ON "lexico"."translations"  ("lexeme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bc0b8d1aa44faf6ebfde865a2" ON "lexico"."translations" USING gin ("translation_full_text_search") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."translations" IS 'An English translation of a Latin dictionary entry'`,
    );
    await queryRunner.query(
      `CREATE TYPE "lexico"."lexemes_part_of_speech_enum" AS ENUM('abbreviation', 'adjective', 'adverb', 'circumfix', 'conjunction', 'determiner', 'idiom', 'inflection', 'interfix', 'interjection', 'noun', 'numeral', 'participle', 'particle', 'phrase', 'prefix', 'preposition', 'pronoun', 'properNoun', 'proverb', 'suffix', 'verb')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."lexemes" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "disambiguator" bigint NOT NULL DEFAULT '0', "etymology" text, "lemma" text NOT NULL, "part_of_speech" "lexico"."lexemes_part_of_speech_enum" NOT NULL, CONSTRAINT "UQ_7e69b70876dfb25936d3eb7f0fa" UNIQUE ("lemma", "disambiguator"), CONSTRAINT "PK_dc81283a4e701643a1e4e9b8633" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."lexemes"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."lexemes"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexico"."lexemes"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexico"."lexemes"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexico"."lexemes"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexico"."lexemes"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexico"."lexemes"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexico"."lexemes"."disambiguator" IS 'Disambiguation index when multiple entries share the same lemma (0-based)'; COMMENT ON COLUMN "lexico"."lexemes"."etymology" IS 'Etymology of the word (Latin or Greek origin)'; COMMENT ON COLUMN "lexico"."lexemes"."lemma" IS 'Dictionary headword (lemma), e.g. ''amō'''; COMMENT ON COLUMN "lexico"."lexemes"."part_of_speech" IS 'Grammatical part of speech'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9204890678d644ba216ae116e3" ON "lexico"."lexemes"  ("lemma") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f6fa0a0a5e197c157882f29c22" ON "lexico"."lexemes"  ("part_of_speech") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."lexemes" IS 'A dictionary entry representing a Latin word form with its translations, principal parts, pronunciation, and inflection data'`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."word_forms" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "form_id" uuid NOT NULL, "word_id" uuid NOT NULL, CONSTRAINT "PK_63a955b077bd9a1209a6286a8de" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."word_forms"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."word_forms"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexico"."word_forms"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexico"."word_forms"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexico"."word_forms"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexico"."word_forms"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexico"."word_forms"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexico"."word_forms"."form_id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."word_forms"."word_id" IS 'Primary key, a uuidv7 the database assigns on insert'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f19edc2c148cc8536b7bba7afa" ON "lexico"."word_forms"  ("form_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_54256ad366638dd2243dcd88b2" ON "lexico"."word_forms"  ("word_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a3450e22c3c4ab78e8f3f817c8" ON "lexico"."word_forms"  ("word_id", "form_id") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."word_forms" IS 'Junction table linking a normalized Latin word string to the morphological forms it can surface as'`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."word_lexemes" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "lexeme_id" uuid NOT NULL, "word_id" uuid NOT NULL, CONSTRAINT "PK_3f773610b2d1c455b70d72915c9" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."word_lexemes"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."word_lexemes"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexico"."word_lexemes"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexico"."word_lexemes"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexico"."word_lexemes"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexico"."word_lexemes"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexico"."word_lexemes"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexico"."word_lexemes"."lexeme_id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."word_lexemes"."word_id" IS 'Primary key, a uuidv7 the database assigns on insert'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_643892e2709e1d49641fb965b8" ON "lexico"."word_lexemes"  ("lexeme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_579999929ed6b899e769cd234b" ON "lexico"."word_lexemes"  ("word_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3bfcf800c79bf43fa516db099d" ON "lexico"."word_lexemes"  ("word_id", "lexeme_id") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."word_lexemes" IS 'Junction table linking a normalized Latin word string to the lexemes (dictionary entries) it can represent'`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."words" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "data" character varying NOT NULL, CONSTRAINT "UQ_e02087015bb44b8ee83a801ca45" UNIQUE ("data"), CONSTRAINT "PK_feaf97accb69a7f355fa6f58a3d" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."words"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."words"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexico"."words"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexico"."words"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexico"."words"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexico"."words"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexico"."words"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexico"."words"."data" IS 'The Latin word as written'`,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."words" IS 'A Latin word string that maps to one or more dictionary entries'`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."tokens" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "data" character varying NOT NULL, "index" bigint NOT NULL, "is_punctuation" boolean NOT NULL, "author_id" uuid, "line_id" uuid, "text_id" uuid, "word_id" uuid, CONSTRAINT "PK_3001e89ada36263dabf1fb6210a" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."tokens"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."tokens"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexico"."tokens"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexico"."tokens"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexico"."tokens"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexico"."tokens"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexico"."tokens"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexico"."tokens"."data" IS 'The raw string value of the token'; COMMENT ON COLUMN "lexico"."tokens"."index" IS 'The 0-based index of this token within its parent line'; COMMENT ON COLUMN "lexico"."tokens"."is_punctuation" IS 'True if the token represents punctuation or whitespace, false if it is a word'; COMMENT ON COLUMN "lexico"."tokens"."author_id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."tokens"."line_id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."tokens"."text_id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."tokens"."word_id" IS 'Primary key, a uuidv7 the database assigns on insert'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_784a19cd725470a3068fc62db3" ON "lexico"."tokens"  ("author_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b7c16a9e93dbe1c7e06542fd67" ON "lexico"."tokens"  ("data") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_75ceaf795d390a0a045c4eccee" ON "lexico"."tokens"  ("word_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_49d4478795971e788f76d88330" ON "lexico"."tokens"  ("text_id", "index") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3e996c69e86e8b258ca8703166" ON "lexico"."tokens"  ("line_id", "index") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."tokens" IS 'A single parsed token (word or punctuation) from a line of literature'`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."lines" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "data" character varying NOT NULL, "index" bigint NOT NULL, "label" character varying(32) NOT NULL, "author_id" uuid, "text_id" uuid, CONSTRAINT "PK_155ad34738bc0e1aab0ca198dea" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."lines"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."lines"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexico"."lines"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexico"."lines"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexico"."lines"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexico"."lines"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexico"."lines"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexico"."lines"."data" IS 'The raw text data content of the line'; COMMENT ON COLUMN "lexico"."lines"."index" IS 'The sequential 0-based index of the line within its text'; COMMENT ON COLUMN "lexico"."lines"."label" IS 'The display label for the line (e.g. section number or roman numeral)'; COMMENT ON COLUMN "lexico"."lines"."author_id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."lines"."text_id" IS 'Primary key, a uuidv7 the database assigns on insert'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_90ccb87cbd0fd6952e1aee4248" ON "lexico"."lines"  ("author_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b2c6fef6d09c7cd7b3c92a5664" ON "lexico"."lines"  ("text_id", "index") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."lines" IS 'A single line of classical Latin literature'`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."texts" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "metadata" jsonb, "slug" character varying(128) NOT NULL, "title" character varying(128) NOT NULL, "type" character varying(32) NOT NULL DEFAULT 'text', "author_id" uuid, "parent_text_id" uuid, CONSTRAINT "UQ_1e4747c023445108890a5cadaeb" UNIQUE ("slug"), CONSTRAINT "PK_ce044efbc0a1872f20feca7e19f" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."texts"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."texts"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexico"."texts"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexico"."texts"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexico"."texts"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexico"."texts"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexico"."texts"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexico"."texts"."metadata" IS 'Unstructured metadata'; COMMENT ON COLUMN "lexico"."texts"."slug" IS 'Unique slug identifier (e.g. ''caesar/de bello gallico'')'; COMMENT ON COLUMN "lexico"."texts"."title" IS 'The title of the text'; COMMENT ON COLUMN "lexico"."texts"."type" IS 'The structural type of the text (e.g. ''book'', ''text'', ''collection'')'; COMMENT ON COLUMN "lexico"."texts"."author_id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."texts"."parent_text_id" IS 'Primary key, a uuidv7 the database assigns on insert'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_275807c423ad9d0b569c2b9ca8" ON "lexico"."texts"  ("author_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c3172aa0d3cd4c678d44dae85c" ON "lexico"."texts"  ("parent_text_id") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."texts" IS 'A hierarchical literary work (corpus, book, text, poem, etc.)'`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexico"."authors" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "metadata" jsonb, "name" character varying(64) NOT NULL, "slug" character varying(64) NOT NULL, CONSTRAINT "UQ_f068a15d416578e89d41189ca25" UNIQUE ("slug"), CONSTRAINT "PK_d2ed02fabd9b52847ccb85e6b88" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexico"."authors"."id" IS 'Primary key, a uuidv7 the database assigns on insert'; COMMENT ON COLUMN "lexico"."authors"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexico"."authors"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexico"."authors"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexico"."authors"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexico"."authors"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexico"."authors"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexico"."authors"."metadata" IS 'Unstructured metadata'; COMMENT ON COLUMN "lexico"."authors"."name" IS 'The display name of the author'; COMMENT ON COLUMN "lexico"."authors"."slug" IS 'Unique slug identifier (e.g. ''caesar'')'`,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."authors" IS 'An author of Latin literature'`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."forms" ADD CONSTRAINT "FK_52ebb86789cf513c7fb44ab9a95" FOREIGN KEY ("lexeme_id") REFERENCES "lexico"."lexemes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."inflections" ADD CONSTRAINT "FK_ebe1d473505c1ffc72c57d57731" FOREIGN KEY ("lexeme_id") REFERENCES "lexico"."lexemes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."principal_parts" ADD CONSTRAINT "FK_95d23e3a9561dea102f7bf9325e" FOREIGN KEY ("lexeme_id") REFERENCES "lexico"."lexemes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."pronunciations" ADD CONSTRAINT "FK_ccf78e53911b7c121a65192c89d" FOREIGN KEY ("lexeme_id") REFERENCES "lexico"."lexemes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."translations" ADD CONSTRAINT "FK_03033925e968b7c9430896d55f8" FOREIGN KEY ("lexeme_id") REFERENCES "lexico"."lexemes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."word_forms" ADD CONSTRAINT "FK_f19edc2c148cc8536b7bba7afa9" FOREIGN KEY ("form_id") REFERENCES "lexico"."forms"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."word_forms" ADD CONSTRAINT "FK_54256ad366638dd2243dcd88b25" FOREIGN KEY ("word_id") REFERENCES "lexico"."words"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."word_lexemes" ADD CONSTRAINT "FK_643892e2709e1d49641fb965b82" FOREIGN KEY ("lexeme_id") REFERENCES "lexico"."lexemes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."word_lexemes" ADD CONSTRAINT "FK_579999929ed6b899e769cd234ba" FOREIGN KEY ("word_id") REFERENCES "lexico"."words"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."tokens" ADD CONSTRAINT "FK_784a19cd725470a3068fc62db39" FOREIGN KEY ("author_id") REFERENCES "lexico"."authors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."tokens" ADD CONSTRAINT "FK_7b903b4a513daa0b4d4839d4cc3" FOREIGN KEY ("line_id") REFERENCES "lexico"."lines"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."tokens" ADD CONSTRAINT "FK_4a94e9093c0191e7f01e0a2d02e" FOREIGN KEY ("text_id") REFERENCES "lexico"."texts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."tokens" ADD CONSTRAINT "FK_75ceaf795d390a0a045c4eccee1" FOREIGN KEY ("word_id") REFERENCES "lexico"."words"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."lines" ADD CONSTRAINT "FK_90ccb87cbd0fd6952e1aee42482" FOREIGN KEY ("author_id") REFERENCES "lexico"."authors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."lines" ADD CONSTRAINT "FK_8ba479aa45ba1795a3f7e5c8d22" FOREIGN KEY ("text_id") REFERENCES "lexico"."texts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."texts" ADD CONSTRAINT "FK_275807c423ad9d0b569c2b9ca81" FOREIGN KEY ("author_id") REFERENCES "lexico"."authors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."texts" ADD CONSTRAINT "FK_c3172aa0d3cd4c678d44dae85cd" FOREIGN KEY ("parent_text_id") REFERENCES "lexico"."texts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lexico"."texts" DROP CONSTRAINT "FK_c3172aa0d3cd4c678d44dae85cd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."texts" DROP CONSTRAINT "FK_275807c423ad9d0b569c2b9ca81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."lines" DROP CONSTRAINT "FK_8ba479aa45ba1795a3f7e5c8d22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."lines" DROP CONSTRAINT "FK_90ccb87cbd0fd6952e1aee42482"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."tokens" DROP CONSTRAINT "FK_75ceaf795d390a0a045c4eccee1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."tokens" DROP CONSTRAINT "FK_4a94e9093c0191e7f01e0a2d02e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."tokens" DROP CONSTRAINT "FK_7b903b4a513daa0b4d4839d4cc3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."tokens" DROP CONSTRAINT "FK_784a19cd725470a3068fc62db39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."word_lexemes" DROP CONSTRAINT "FK_579999929ed6b899e769cd234ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."word_lexemes" DROP CONSTRAINT "FK_643892e2709e1d49641fb965b82"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."word_forms" DROP CONSTRAINT "FK_54256ad366638dd2243dcd88b25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."word_forms" DROP CONSTRAINT "FK_f19edc2c148cc8536b7bba7afa9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."translations" DROP CONSTRAINT "FK_03033925e968b7c9430896d55f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."pronunciations" DROP CONSTRAINT "FK_ccf78e53911b7c121a65192c89d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."principal_parts" DROP CONSTRAINT "FK_95d23e3a9561dea102f7bf9325e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."inflections" DROP CONSTRAINT "FK_ebe1d473505c1ffc72c57d57731"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lexico"."forms" DROP CONSTRAINT "FK_52ebb86789cf513c7fb44ab9a95"`,
    );
    await queryRunner.query(`COMMENT ON TABLE "lexico"."authors" IS NULL`);
    await queryRunner.query(`DROP TABLE "lexico"."authors"`);
    await queryRunner.query(`COMMENT ON TABLE "lexico"."texts" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_c3172aa0d3cd4c678d44dae85c"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_275807c423ad9d0b569c2b9ca8"`,
    );
    await queryRunner.query(`DROP TABLE "lexico"."texts"`);
    await queryRunner.query(`COMMENT ON TABLE "lexico"."lines" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_b2c6fef6d09c7cd7b3c92a5664"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_90ccb87cbd0fd6952e1aee4248"`,
    );
    await queryRunner.query(`DROP TABLE "lexico"."lines"`);
    await queryRunner.query(`COMMENT ON TABLE "lexico"."tokens" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_3e996c69e86e8b258ca8703166"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_49d4478795971e788f76d88330"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_75ceaf795d390a0a045c4eccee"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_b7c16a9e93dbe1c7e06542fd67"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_784a19cd725470a3068fc62db3"`,
    );
    await queryRunner.query(`DROP TABLE "lexico"."tokens"`);
    await queryRunner.query(`COMMENT ON TABLE "lexico"."words" IS NULL`);
    await queryRunner.query(`DROP TABLE "lexico"."words"`);
    await queryRunner.query(`COMMENT ON TABLE "lexico"."word_lexemes" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_3bfcf800c79bf43fa516db099d"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_579999929ed6b899e769cd234b"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_643892e2709e1d49641fb965b8"`,
    );
    await queryRunner.query(`DROP TABLE "lexico"."word_lexemes"`);
    await queryRunner.query(`COMMENT ON TABLE "lexico"."word_forms" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_a3450e22c3c4ab78e8f3f817c8"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_54256ad366638dd2243dcd88b2"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_f19edc2c148cc8536b7bba7afa"`,
    );
    await queryRunner.query(`DROP TABLE "lexico"."word_forms"`);
    await queryRunner.query(`COMMENT ON TABLE "lexico"."lexemes" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_f6fa0a0a5e197c157882f29c22"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_9204890678d644ba216ae116e3"`,
    );
    await queryRunner.query(`DROP TABLE "lexico"."lexemes"`);
    await queryRunner.query(`DROP TYPE "lexico"."lexemes_part_of_speech_enum"`);
    await queryRunner.query(`COMMENT ON TABLE "lexico"."translations" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_9bc0b8d1aa44faf6ebfde865a2"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_03033925e968b7c9430896d55f"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_39313ab7fdf2f551cde7ef9611"`,
    );
    await queryRunner.query(`DROP TABLE "lexico"."translations"`);
    await queryRunner.query(
      `DELETE FROM "lexico"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = current_database() AND "schema" = $3 AND "table" = $4`,
      [
        "GENERATED_COLUMN",
        "translation_full_text_search",
        "lexico",
        "translations",
      ],
    );
    await queryRunner.query(`DROP TABLE "lexico"."typeorm_metadata"`);
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."pronunciations" IS NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_81c176364b794cdcdf309a7a60"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_8fc53b1cbb6c5683b37f65a328"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_8de57efb4c40b209b2883c3d8c"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_ccf78e53911b7c121a65192c89"`,
    );
    await queryRunner.query(`DROP TABLE "lexico"."pronunciations"`);
    await queryRunner.query(`DROP TYPE "lexico"."pronunciations_variant_enum"`);
    await queryRunner.query(
      `COMMENT ON TABLE "lexico"."principal_parts" IS NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_95d23e3a9561dea102f7bf9325"`,
    );
    await queryRunner.query(`DROP TABLE "lexico"."principal_parts"`);
    await queryRunner.query(`COMMENT ON TABLE "lexico"."inflections" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_2f191c1029749f9f01b877e7f8"`,
    );
    await queryRunner.query(`DROP TABLE "lexico"."inflections"`);
    await queryRunner.query(
      `DROP TYPE "lexico"."inflections_conjugation_enum"`,
    );
    await queryRunner.query(`DROP TYPE "lexico"."inflections_case_enum"`);
    await queryRunner.query(`DROP TYPE "lexico"."inflections_gender_enum"`);
    await queryRunner.query(
      `DROP TYPE "lexico"."inflections_adverb_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "lexico"."inflections_degree_enum"`);
    await queryRunner.query(`DROP TYPE "lexico"."inflections_declension_enum"`);
    await queryRunner.query(`COMMENT ON TABLE "lexico"."forms" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_2bc463838022e5cc652df63c4a"`,
    );
    await queryRunner.query(
      `DROP INDEX "lexico"."IDX_52ebb86789cf513c7fb44ab9a9"`,
    );
    await queryRunner.query(`DROP TABLE "lexico"."forms"`);
    await queryRunner.query(`DROP TYPE "lexico"."forms_voice_enum"`);
    await queryRunner.query(`DROP TYPE "lexico"."forms_tense_enum"`);
    await queryRunner.query(`DROP TYPE "lexico"."forms_person_enum"`);
    await queryRunner.query(`DROP TYPE "lexico"."forms_mood_enum"`);
    await queryRunner.query(`DROP TYPE "lexico"."forms_degree_enum"`);
    await queryRunner.query(`DROP TYPE "lexico"."forms_number_enum"`);
    await queryRunner.query(`DROP TYPE "lexico"."forms_gender_enum"`);
    await queryRunner.query(`DROP TYPE "lexico"."forms_form_case_enum"`);
  }
}
