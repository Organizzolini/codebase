import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates and drops the initial Lexico database schema.
 */
export class Migration1781126991393 implements MigrationInterface {
  name = "Migration1781126991393";

  /**
   * Reverts this migration by dropping tables, indexes, enums, and constraints.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tokens" DROP CONSTRAINT "FK_75ceaf795d390a0a045c4eccee1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" DROP CONSTRAINT "FK_4a94e9093c0191e7f01e0a2d02e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" DROP CONSTRAINT "FK_7b903b4a513daa0b4d4839d4cc3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" DROP CONSTRAINT "FK_784a19cd725470a3068fc62db39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "texts" DROP CONSTRAINT "FK_c3172aa0d3cd4c678d44dae85cd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "texts" DROP CONSTRAINT "FK_275807c423ad9d0b569c2b9ca81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lines" DROP CONSTRAINT "FK_8ba479aa45ba1795a3f7e5c8d22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lines" DROP CONSTRAINT "FK_90ccb87cbd0fd6952e1aee42482"`,
    );
    await queryRunner.query(
      `ALTER TABLE "word_lexemes" DROP CONSTRAINT "FK_579999929ed6b899e769cd234ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "word_lexemes" DROP CONSTRAINT "FK_643892e2709e1d49641fb965b82"`,
    );
    await queryRunner.query(
      `ALTER TABLE "word_forms" DROP CONSTRAINT "FK_54256ad366638dd2243dcd88b25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "word_forms" DROP CONSTRAINT "FK_f19edc2c148cc8536b7bba7afa9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "translations" DROP CONSTRAINT "FK_03033925e968b7c9430896d55f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pronunciations" DROP CONSTRAINT "FK_ccf78e53911b7c121a65192c89d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "principal_parts" DROP CONSTRAINT "FK_95d23e3a9561dea102f7bf9325e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inflections" DROP CONSTRAINT "FK_ebe1d473505c1ffc72c57d57731"`,
    );
    await queryRunner.query(
      `ALTER TABLE "forms" DROP CONSTRAINT "FK_52ebb86789cf513c7fb44ab9a95"`,
    );
    await queryRunner.query(`COMMENT ON TABLE "tokens" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3e996c69e86e8b258ca8703166"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_49d4478795971e788f76d88330"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_75ceaf795d390a0a045c4eccee"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b7c16a9e93dbe1c7e06542fd67"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_784a19cd725470a3068fc62db3"`,
    );
    await queryRunner.query(`DROP TABLE "tokens"`);
    await queryRunner.query(`COMMENT ON TABLE "texts" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c3172aa0d3cd4c678d44dae85c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_275807c423ad9d0b569c2b9ca8"`,
    );
    await queryRunner.query(`DROP TABLE "texts"`);
    await queryRunner.query(`COMMENT ON TABLE "lines" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b2c6fef6d09c7cd7b3c92a5664"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_90ccb87cbd0fd6952e1aee4248"`,
    );
    await queryRunner.query(`DROP TABLE "lines"`);
    await queryRunner.query(`COMMENT ON TABLE "authors" IS NULL`);
    await queryRunner.query(`DROP TABLE "authors"`);
    await queryRunner.query(`COMMENT ON TABLE "words" IS NULL`);
    await queryRunner.query(`DROP TABLE "words"`);
    await queryRunner.query(`COMMENT ON TABLE "word_lexemes" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3bfcf800c79bf43fa516db099d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_579999929ed6b899e769cd234b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_643892e2709e1d49641fb965b8"`,
    );
    await queryRunner.query(`DROP TABLE "word_lexemes"`);
    await queryRunner.query(`COMMENT ON TABLE "word_forms" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a3450e22c3c4ab78e8f3f817c8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_54256ad366638dd2243dcd88b2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f19edc2c148cc8536b7bba7afa"`,
    );
    await queryRunner.query(`DROP TABLE "word_forms"`);
    await queryRunner.query(`COMMENT ON TABLE "lexemes" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f6fa0a0a5e197c157882f29c22"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9204890678d644ba216ae116e3"`,
    );
    await queryRunner.query(`DROP TABLE "lexemes"`);
    await queryRunner.query(`DROP TYPE "public"."lexemes_part_of_speech_enum"`);
    await queryRunner.query(`COMMENT ON TABLE "translations" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9bc0b8d1aa44faf6ebfde865a2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_03033925e968b7c9430896d55f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_39313ab7fdf2f551cde7ef9611"`,
    );
    await queryRunner.query(`DROP TABLE "translations"`);
    await queryRunner.query(
      `DELETE FROM "public"."typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`,
      [
        "GENERATED_COLUMN",
        "translation_full_text_search",
        "postgres",
        "public",
        "translations",
      ],
    );
    await queryRunner.query(`COMMENT ON TABLE "pronunciations" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_81c176364b794cdcdf309a7a60"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8fc53b1cbb6c5683b37f65a328"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8de57efb4c40b209b2883c3d8c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ccf78e53911b7c121a65192c89"`,
    );
    await queryRunner.query(`DROP TABLE "pronunciations"`);
    await queryRunner.query(`DROP TYPE "public"."pronunciations_variant_enum"`);
    await queryRunner.query(`COMMENT ON TABLE "principal_parts" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_95d23e3a9561dea102f7bf9325"`,
    );
    await queryRunner.query(`DROP TABLE "principal_parts"`);
    await queryRunner.query(`COMMENT ON TABLE "inflections" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2f191c1029749f9f01b877e7f8"`,
    );
    await queryRunner.query(`DROP TABLE "inflections"`);
    await queryRunner.query(
      `DROP TYPE "public"."inflections_conjugation_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."inflections_case_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."inflections_adverb_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."inflections_degree_enum"`);
    await queryRunner.query(`DROP TYPE "public"."inflections_gender_enum"`);
    await queryRunner.query(`DROP TYPE "public"."inflections_declension_enum"`);
    await queryRunner.query(`COMMENT ON TABLE "forms" IS NULL`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2bc463838022e5cc652df63c4a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_52ebb86789cf513c7fb44ab9a9"`,
    );
    await queryRunner.query(`DROP TABLE "forms"`);
    await queryRunner.query(`DROP TYPE "public"."forms_voice_enum"`);
    await queryRunner.query(`DROP TYPE "public"."forms_tense_enum"`);
    await queryRunner.query(`DROP TYPE "public"."forms_person_enum"`);
    await queryRunner.query(`DROP TYPE "public"."forms_mood_enum"`);
    await queryRunner.query(`DROP TYPE "public"."forms_degree_enum"`);
    await queryRunner.query(`DROP TYPE "public"."forms_number_enum"`);
    await queryRunner.query(`DROP TYPE "public"."forms_gender_enum"`);
    await queryRunner.query(`DROP TYPE "public"."forms_form_case_enum"`);
  }

  /**
   * Applies this migration by creating tables, indexes, enums, and constraints.
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."forms_form_case_enum" AS ENUM('nominative', 'genitive', 'dative', 'accusative', 'ablative', 'vocative', 'locative')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."forms_gender_enum" AS ENUM('masculine', 'feminine', 'neuter')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."forms_number_enum" AS ENUM('singular', 'plural')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."forms_degree_enum" AS ENUM('positive', 'comparative', 'superlative')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."forms_mood_enum" AS ENUM('indicative', 'subjunctive', 'imperative')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."forms_person_enum" AS ENUM('first', 'second', 'third')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."forms_tense_enum" AS ENUM('present', 'imperfect', 'future', 'perfect', 'pluperfect', 'futurePerfect')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."forms_voice_enum" AS ENUM('active', 'passive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "forms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "form_case" "public"."forms_form_case_enum", "gender" "public"."forms_gender_enum", "number" "public"."forms_number_enum", "degree" "public"."forms_degree_enum", "mood" "public"."forms_mood_enum", "person" "public"."forms_person_enum", "tense" "public"."forms_tense_enum", "voice" "public"."forms_voice_enum", "type" text NOT NULL, "lexeme_id" uuid NOT NULL, CONSTRAINT "PK_ba062fd30b06814a60756f233da" PRIMARY KEY ("id")); COMMENT ON COLUMN "forms"."id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "forms"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "forms"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "forms"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "forms"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "forms"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "forms"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "forms"."form_case" IS 'Grammatical case of this form'; COMMENT ON COLUMN "forms"."gender" IS 'Grammatical gender of this adjectival form'; COMMENT ON COLUMN "forms"."number" IS 'Grammatical number (singular or plural)'; COMMENT ON COLUMN "forms"."degree" IS 'Degree of comparison (positive, comparative, superlative)'; COMMENT ON COLUMN "forms"."mood" IS 'Grammatical mood (indicative, subjunctive, imperative)'; COMMENT ON COLUMN "forms"."person" IS 'Grammatical person (first, second, third)'; COMMENT ON COLUMN "forms"."tense" IS 'Grammatical tense'; COMMENT ON COLUMN "forms"."voice" IS 'Grammatical voice (active or passive)'; COMMENT ON COLUMN "forms"."lexeme_id" IS 'Auto-generated UUID primary key'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_52ebb86789cf513c7fb44ab9a9" ON "forms"  ("lexeme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2bc463838022e5cc652df63c4a" ON "forms"  ("type") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "forms" IS 'Abstract base table for normalized inflected forms using single-table inheritance'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inflections_declension_enum" AS ENUM('first', 'second', 'third', 'fourth', 'fifth', 'first/second', '')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inflections_gender_enum" AS ENUM('masculine', 'feminine', 'masc/fem', 'neuter', '')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inflections_degree_enum" AS ENUM('positive', 'comparative', 'superlative')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inflections_adverb_type_enum" AS ENUM('descriptive', 'conjunctional', '')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inflections_case_enum" AS ENUM('accusative', 'ablative', '')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inflections_conjugation_enum" AS ENUM('first', 'second', 'third', 'third-io', 'fourth', '')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inflections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "declension" "public"."inflections_declension_enum" DEFAULT '', "gender" "public"."inflections_gender_enum" DEFAULT '', "other" text, "degree" "public"."inflections_degree_enum" DEFAULT 'positive', "adverb_type" "public"."inflections_adverb_type_enum" DEFAULT '', "case" "public"."inflections_case_enum" DEFAULT '', "conjugation" "public"."inflections_conjugation_enum" DEFAULT '', "type" text NOT NULL, "lexeme_id" uuid, CONSTRAINT "REL_ebe1d473505c1ffc72c57d5773" UNIQUE ("lexeme_id"), CONSTRAINT "PK_a70d36c564be34be3f08a08bc0b" PRIMARY KEY ("id")); COMMENT ON COLUMN "inflections"."id" IS 'Auto-generated UUID; discriminator column ''type'' selects the child entity'; COMMENT ON COLUMN "inflections"."declension" IS 'Noun declension class (first through fifth)'; COMMENT ON COLUMN "inflections"."gender" IS 'Grammatical gender (masculine, feminine, neuter)'; COMMENT ON COLUMN "inflections"."other" IS 'Additional inflection notes'; COMMENT ON COLUMN "inflections"."degree" IS 'Degree of comparison (positive, comparative, superlative)'; COMMENT ON COLUMN "inflections"."adverb_type" IS 'Functional type of the adverb (descriptive or conjunctional)'; COMMENT ON COLUMN "inflections"."case" IS 'Grammatical case governed by the preposition (accusative or ablative)'; COMMENT ON COLUMN "inflections"."conjugation" IS 'Verb conjugation class (first through fourth)'; COMMENT ON COLUMN "inflections"."lexeme_id" IS 'Auto-generated UUID primary key'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2f191c1029749f9f01b877e7f8" ON "inflections"  ("type") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "inflections" IS 'Abstract base table for grammatical inflection metadata using single-table inheritance'`,
    );
    await queryRunner.query(
      `CREATE TABLE "principal_parts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "name" text NOT NULL, "text" jsonb NOT NULL, "lexeme_id" uuid, CONSTRAINT "PK_a7efc0b33c62679b3302fe95f8d" PRIMARY KEY ("id")); COMMENT ON COLUMN "principal_parts"."id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "principal_parts"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "principal_parts"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "principal_parts"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "principal_parts"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "principal_parts"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "principal_parts"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "principal_parts"."name" IS 'Label for the principal part (e.g. first, infinitive)'; COMMENT ON COLUMN "principal_parts"."text" IS 'One or more textual forms for this principal part'; COMMENT ON COLUMN "principal_parts"."lexeme_id" IS 'Auto-generated UUID primary key'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_95d23e3a9561dea102f7bf9325" ON "principal_parts"  ("lexeme_id") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "principal_parts" IS 'A named principal part (e.g. first, infinitive) of a Latin dictionary entry'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pronunciations_variant_enum" AS ENUM('classical', 'ecclesiastical', 'vulgar')`,
    );
    await queryRunner.query(
      `CREATE TABLE "pronunciations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "phonemes" text, "phonemic" text, "phonetic" text, "variant" "public"."pronunciations_variant_enum" NOT NULL, "lexeme_id" uuid, CONSTRAINT "UQ_a90eaf47f480c0d14365fdd34b1" UNIQUE ("lexeme_id", "variant"), CONSTRAINT "PK_fb90cb28dd8dcce6ee8d677d067" PRIMARY KEY ("id")); COMMENT ON COLUMN "pronunciations"."id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "pronunciations"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "pronunciations"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "pronunciations"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "pronunciations"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "pronunciations"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "pronunciations"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "pronunciations"."phonemes" IS 'Phonemic segmentation (e.g. a.moː)'; COMMENT ON COLUMN "pronunciations"."phonemic" IS 'Phonemic IPA transcription (e.g. /ˈaː.moː/)'; COMMENT ON COLUMN "pronunciations"."phonetic" IS 'Phonetic IPA transcription (e.g. [ˈäː.moː])'; COMMENT ON COLUMN "pronunciations"."variant" IS 'Pronunciation tradition (classical, ecclesiastical, or vulgar)'; COMMENT ON COLUMN "pronunciations"."lexeme_id" IS 'Auto-generated UUID primary key'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ccf78e53911b7c121a65192c89" ON "pronunciations"  ("lexeme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8de57efb4c40b209b2883c3d8c" ON "pronunciations"  ("phonemes") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8fc53b1cbb6c5683b37f65a328" ON "pronunciations"  ("phonemic") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_81c176364b794cdcdf309a7a60" ON "pronunciations"  ("variant") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "pronunciations" IS 'A pronunciation variant (classical, ecclesiastical, or vulgar) for a Latin lexeme'`,
    );
    await queryRunner.query(
      `INSERT INTO "public"."typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        "postgres",
        "public",
        "translations",
        "GENERATED_COLUMN",
        "translation_full_text_search",
        "to_tsvector('english', data)",
      ],
    );
    await queryRunner.query(
      `CREATE TABLE "translations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "data" text NOT NULL, "translation_full_text_search" tsvector GENERATED ALWAYS AS (to_tsvector('english', data)) STORED, "lexeme_id" uuid, CONSTRAINT "PK_aca248c72ae1fb2390f1bf4cd87" PRIMARY KEY ("id")); COMMENT ON COLUMN "translations"."id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "translations"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "translations"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "translations"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "translations"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "translations"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "translations"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "translations"."data" IS 'English translation text'; COMMENT ON COLUMN "translations"."lexeme_id" IS 'Auto-generated UUID primary key'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_39313ab7fdf2f551cde7ef9611" ON "translations"  ("data") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_03033925e968b7c9430896d55f" ON "translations"  ("lexeme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bc0b8d1aa44faf6ebfde865a2" ON "translations" USING gin ("translation_full_text_search") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "translations" IS 'An English translation of a Latin dictionary entry'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lexemes_part_of_speech_enum" AS ENUM('noun', 'properNoun', 'verb', 'adjective', 'participle', 'adverb', 'pronoun', 'determiner', 'preposition', 'conjunction', 'numeral', 'abbreviation', 'particle', 'interjection', 'prefix', 'suffix', 'interfix', 'circumfix', 'inflection', 'phrase', 'proverb', 'idiom')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lexemes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "disambiguator" bigint NOT NULL DEFAULT '0', "etymology" text, "lemma" text NOT NULL, "part_of_speech" "public"."lexemes_part_of_speech_enum" NOT NULL, CONSTRAINT "UQ_7e69b70876dfb25936d3eb7f0fa" UNIQUE ("lemma", "disambiguator"), CONSTRAINT "PK_dc81283a4e701643a1e4e9b8633" PRIMARY KEY ("id")); COMMENT ON COLUMN "lexemes"."id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "lexemes"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lexemes"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lexemes"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lexemes"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lexemes"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lexemes"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lexemes"."disambiguator" IS 'Disambiguation index when multiple entries share the same lemma (0-based)'; COMMENT ON COLUMN "lexemes"."etymology" IS 'Etymology of the word (Latin or Greek origin)'; COMMENT ON COLUMN "lexemes"."lemma" IS 'Dictionary headword (lemma), e.g. ''amō'''; COMMENT ON COLUMN "lexemes"."part_of_speech" IS 'Grammatical part of speech'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9204890678d644ba216ae116e3" ON "lexemes"  ("lemma") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f6fa0a0a5e197c157882f29c22" ON "lexemes"  ("part_of_speech") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lexemes" IS 'A dictionary entry representing a Latin word form with its translations, principal parts, pronunciation, and inflection data'`,
    );
    await queryRunner.query(
      `CREATE TABLE "word_forms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "form_id" uuid NOT NULL, "word_id" uuid NOT NULL, CONSTRAINT "PK_63a955b077bd9a1209a6286a8de" PRIMARY KEY ("id")); COMMENT ON COLUMN "word_forms"."id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "word_forms"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "word_forms"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "word_forms"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "word_forms"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "word_forms"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "word_forms"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "word_forms"."form_id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "word_forms"."word_id" IS 'Auto-generated UUID primary key'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f19edc2c148cc8536b7bba7afa" ON "word_forms"  ("form_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_54256ad366638dd2243dcd88b2" ON "word_forms"  ("word_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a3450e22c3c4ab78e8f3f817c8" ON "word_forms"  ("word_id", "form_id") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "word_forms" IS 'Junction table linking a normalized Latin word string to the morphological forms it can surface as'`,
    );
    await queryRunner.query(
      `CREATE TABLE "word_lexemes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "lexeme_id" uuid NOT NULL, "word_id" uuid NOT NULL, CONSTRAINT "PK_3f773610b2d1c455b70d72915c9" PRIMARY KEY ("id")); COMMENT ON COLUMN "word_lexemes"."id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "word_lexemes"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "word_lexemes"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "word_lexemes"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "word_lexemes"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "word_lexemes"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "word_lexemes"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "word_lexemes"."lexeme_id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "word_lexemes"."word_id" IS 'Auto-generated UUID primary key'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_643892e2709e1d49641fb965b8" ON "word_lexemes"  ("lexeme_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_579999929ed6b899e769cd234b" ON "word_lexemes"  ("word_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3bfcf800c79bf43fa516db099d" ON "word_lexemes"  ("word_id", "lexeme_id") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "word_lexemes" IS 'Junction table linking a normalized Latin word string to the lexemes (dictionary entries) it can represent'`,
    );
    await queryRunner.query(
      `CREATE TABLE "words" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "data" character varying NOT NULL, CONSTRAINT "UQ_e02087015bb44b8ee83a801ca45" UNIQUE ("data"), CONSTRAINT "PK_feaf97accb69a7f355fa6f58a3d" PRIMARY KEY ("id")); COMMENT ON COLUMN "words"."id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "words"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "words"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "words"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "words"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "words"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "words"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "words"."data" IS 'The Latin word as written'`,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "words" IS 'A Latin word string that maps to one or more dictionary entries'`,
    );
    await queryRunner.query(
      `CREATE TABLE "authors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "metadata" jsonb, "name" character varying(64) NOT NULL, "slug" character varying(64) NOT NULL, CONSTRAINT "UQ_f068a15d416578e89d41189ca25" UNIQUE ("slug"), CONSTRAINT "PK_d2ed02fabd9b52847ccb85e6b88" PRIMARY KEY ("id")); COMMENT ON COLUMN "authors"."id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "authors"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "authors"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "authors"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "authors"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "authors"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "authors"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "authors"."metadata" IS 'Unstructured metadata'; COMMENT ON COLUMN "authors"."name" IS 'The display name of the author'; COMMENT ON COLUMN "authors"."slug" IS 'Unique slug identifier (e.g. ''caesar'')'`,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "authors" IS 'An author of Latin literature'`,
    );
    await queryRunner.query(
      `CREATE TABLE "lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "data" character varying NOT NULL, "index" bigint NOT NULL, "label" character varying(32) NOT NULL, "author_id" uuid, "text_id" uuid, CONSTRAINT "PK_155ad34738bc0e1aab0ca198dea" PRIMARY KEY ("id")); COMMENT ON COLUMN "lines"."id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "lines"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "lines"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "lines"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "lines"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "lines"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "lines"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "lines"."data" IS 'The raw text data content of the line'; COMMENT ON COLUMN "lines"."index" IS 'The sequential 0-based index of the line within its text'; COMMENT ON COLUMN "lines"."label" IS 'The display label for the line (e.g. section number or roman numeral)'; COMMENT ON COLUMN "lines"."author_id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "lines"."text_id" IS 'Auto-generated UUID primary key'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_90ccb87cbd0fd6952e1aee4248" ON "lines"  ("author_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b2c6fef6d09c7cd7b3c92a5664" ON "lines"  ("text_id", "index") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "lines" IS 'A single line of classical Latin literature'`,
    );
    await queryRunner.query(
      `CREATE TABLE "texts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "metadata" jsonb, "slug" character varying(128) NOT NULL, "title" character varying(128) NOT NULL, "type" character varying(32) NOT NULL DEFAULT 'text', "author_id" uuid, "parent_text_id" uuid, CONSTRAINT "UQ_1e4747c023445108890a5cadaeb" UNIQUE ("slug"), CONSTRAINT "PK_ce044efbc0a1872f20feca7e19f" PRIMARY KEY ("id")); COMMENT ON COLUMN "texts"."id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "texts"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "texts"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "texts"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "texts"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "texts"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "texts"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "texts"."metadata" IS 'Unstructured metadata'; COMMENT ON COLUMN "texts"."slug" IS 'Unique slug identifier (e.g. ''caesar/de bello gallico'')'; COMMENT ON COLUMN "texts"."title" IS 'The title of the text'; COMMENT ON COLUMN "texts"."type" IS 'The structural type of the text (e.g. ''book'', ''text'', ''collection'')'; COMMENT ON COLUMN "texts"."author_id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "texts"."parent_text_id" IS 'Auto-generated UUID primary key'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_275807c423ad9d0b569c2b9ca8" ON "texts"  ("author_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c3172aa0d3cd4c678d44dae85c" ON "texts"  ("parent_text_id") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "texts" IS 'A hierarchical literary work (corpus, book, text, poem, etc.)'`,
    );
    await queryRunner.query(
      `CREATE TABLE "tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" uuid, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_by" uuid, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" uuid, "data" character varying NOT NULL, "index" bigint NOT NULL, "is_punctuation" boolean NOT NULL, "author_id" uuid, "line_id" uuid, "text_id" uuid, "word_id" uuid, CONSTRAINT "PK_3001e89ada36263dabf1fb6210a" PRIMARY KEY ("id")); COMMENT ON COLUMN "tokens"."id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "tokens"."created_at" IS 'Timestamp when the record was created'; COMMENT ON COLUMN "tokens"."created_by" IS 'Identifier of the user or process that created the record'; COMMENT ON COLUMN "tokens"."updated_at" IS 'Timestamp when the record was last updated'; COMMENT ON COLUMN "tokens"."updated_by" IS 'Identifier of the user or process that last updated the record'; COMMENT ON COLUMN "tokens"."deleted_at" IS 'Timestamp when the record was soft-deleted'; COMMENT ON COLUMN "tokens"."deleted_by" IS 'Identifier of the user or process that soft-deleted the record'; COMMENT ON COLUMN "tokens"."data" IS 'The raw string value of the token'; COMMENT ON COLUMN "tokens"."index" IS 'The 0-based index of this token within its parent line'; COMMENT ON COLUMN "tokens"."is_punctuation" IS 'True if the token represents punctuation or whitespace, false if it is a word'; COMMENT ON COLUMN "tokens"."author_id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "tokens"."line_id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "tokens"."text_id" IS 'Auto-generated UUID primary key'; COMMENT ON COLUMN "tokens"."word_id" IS 'Auto-generated UUID primary key'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_784a19cd725470a3068fc62db3" ON "tokens"  ("author_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b7c16a9e93dbe1c7e06542fd67" ON "tokens"  ("data") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_75ceaf795d390a0a045c4eccee" ON "tokens"  ("word_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_49d4478795971e788f76d88330" ON "tokens"  ("text_id", "index") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3e996c69e86e8b258ca8703166" ON "tokens"  ("line_id", "index") `,
    );
    await queryRunner.query(
      `COMMENT ON TABLE "tokens" IS 'A single parsed token (word or punctuation) from a line of literature'`,
    );
    await queryRunner.query(
      `ALTER TABLE "forms" ADD CONSTRAINT "FK_52ebb86789cf513c7fb44ab9a95" FOREIGN KEY ("lexeme_id") REFERENCES "lexemes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "inflections" ADD CONSTRAINT "FK_ebe1d473505c1ffc72c57d57731" FOREIGN KEY ("lexeme_id") REFERENCES "lexemes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "principal_parts" ADD CONSTRAINT "FK_95d23e3a9561dea102f7bf9325e" FOREIGN KEY ("lexeme_id") REFERENCES "lexemes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "pronunciations" ADD CONSTRAINT "FK_ccf78e53911b7c121a65192c89d" FOREIGN KEY ("lexeme_id") REFERENCES "lexemes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "translations" ADD CONSTRAINT "FK_03033925e968b7c9430896d55f8" FOREIGN KEY ("lexeme_id") REFERENCES "lexemes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "word_forms" ADD CONSTRAINT "FK_f19edc2c148cc8536b7bba7afa9" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "word_forms" ADD CONSTRAINT "FK_54256ad366638dd2243dcd88b25" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "word_lexemes" ADD CONSTRAINT "FK_643892e2709e1d49641fb965b82" FOREIGN KEY ("lexeme_id") REFERENCES "lexemes"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "word_lexemes" ADD CONSTRAINT "FK_579999929ed6b899e769cd234ba" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "lines" ADD CONSTRAINT "FK_90ccb87cbd0fd6952e1aee42482" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lines" ADD CONSTRAINT "FK_8ba479aa45ba1795a3f7e5c8d22" FOREIGN KEY ("text_id") REFERENCES "texts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "texts" ADD CONSTRAINT "FK_275807c423ad9d0b569c2b9ca81" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "texts" ADD CONSTRAINT "FK_c3172aa0d3cd4c678d44dae85cd" FOREIGN KEY ("parent_text_id") REFERENCES "texts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD CONSTRAINT "FK_784a19cd725470a3068fc62db39" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD CONSTRAINT "FK_7b903b4a513daa0b4d4839d4cc3" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD CONSTRAINT "FK_4a94e9093c0191e7f01e0a2d02e" FOREIGN KEY ("text_id") REFERENCES "texts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD CONSTRAINT "FK_75ceaf795d390a0a045c4eccee1" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
