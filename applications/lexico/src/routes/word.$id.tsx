import { createFileRoute, Link } from "@tanstack/react-router";
import { noop } from "lodash";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button, Separator } from "@codebase/components-web";

import { AdjectiveFormsTable } from "../components/entry/adjective-forms-table";
import { NounFormsTable } from "../components/entry/noun-forms-table";
import { PrincipalParts } from "../components/entry/principal-parts";
import { VerbFormsTable } from "../components/entry/verb-forms-table";
import { PronunciationButton } from "../components/PronunciationButton";
import { isBookmarked, toggleBookmark } from "../lib/bookmarks";
import { transformForms } from "../lib/forms";
import { getEntry } from "../lib/search";

import type { EntryFull } from "../lib/types";
import type { ReactNode } from "react";

export const Route = createFileRoute("/word/$id")({
  component: WordPage,
  loader: async ({ params: parameters }) => {
    const entry = await getEntry({ data: { id: parameters.id } });
    return { entry };
  },
});

// 🔤 Pronunciation section sub-component

/**
 * Word forms props.
 */
interface WordFormsProperties {
  partOfSpeech: string;
  rawForms: EntryFull["forms"];
}

/**
 * Word pronunciation props.
 */
interface WordPronunciationProperties {
  pronunciation: EntryFull["pronunciation"];
  wordText: string;
}

// 📋 Forms section sub-component

/**
 * Word forms.
 */
function WordForms(properties: WordFormsProperties): ReactNode {
  const { partOfSpeech, rawForms } = properties;
  const transformed = transformForms(partOfSpeech, rawForms);

  if (!transformed) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Forms</h2>
      {transformed.type === "noun" && (
        <NounFormsTable forms={transformed.forms} />
      )}
      {transformed.type === "verb" && (
        <VerbFormsTable forms={transformed.forms} />
      )}
      {transformed.type === "adjective" && (
        <AdjectiveFormsTable forms={transformed.forms} />
      )}
    </section>
  );
}

/**
 * Word detail page component that displays full entry information.
 *
 * @returns React node.
 */
function WordPage(): ReactNode {
  const loaderData = Route.useLoaderData();
  const { entry } = loaderData;
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (entry) {
      void isBookmarked({ data: { entryId: entry.id } }).then(setBookmarked);
    }
  }, [entry]);

  const handleBookmarkToggle = useCallback(async () => {
    if (!entry) return;
    const result = await toggleBookmark({ data: { entryId: entry.id } });
    if (result.success) {
      setBookmarked(result.bookmarked);
    }
  }, [entry]);

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <h1 className="text-2xl font-bold">Entry Not Found</h1>
        <p className="text-muted-foreground">
          The word you are looking for does not exist in our dictionary.
        </p>
        <Link
          className="text-primary hover:underline"
          to="/search"
        >
          ← Back to Search
        </Link>
      </div>
    );
  }

  const hasPronunciation =
    entry.pronunciation.classical ?? entry.pronunciation.ecclesiastical;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      {/* Navigation bar */}
      <div className="flex items-center justify-between">
        <Link
          className="text-muted-foreground hover:text-foreground"
          to="/search"
        >
          ← Back to Search
        </Link>
        <Button
          onClick={() => void handleBookmarkToggle()}
          size="icon"
          title={bookmarked ? "Remove bookmark" : "Add bookmark"}
          variant="ghost"
        >
          {bookmarked ? (
            <BookmarkCheck className="h-5 w-5 text-primary" />
          ) : (
            <Bookmark className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Page header with principal parts */}
      <header className="space-y-2">
        <PrincipalParts
          className="border-none p-0"
          id={entry.id}
          inflection={entry.inflection}
          onBookmarkToggle={noop}
          partOfSpeech={entry.part_of_speech}
          principalParts={entry.principal_parts}
        />
      </header>

      <Separator />

      {/* Main content sections */}
      <article className="space-y-10">
        {/* Translations section */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Definitions</h2>
          <ul className="space-y-2">
            {entry.translations.map((translation) => (
              <li
                key={translation}
                className="flex items-start gap-3"
              >
                <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-foreground" />
                <span className="text-lg">{translation}</span>
              </li>
            ))}
          </ul>
        </section>

        {hasPronunciation && (
          <>
            <Separator />
            <WordPronunciation
              pronunciation={entry.pronunciation}
              wordText={entry.principal_parts.present ?? entry.id}
            />
          </>
        )}

        <>
          <Separator />
          <WordForms
            partOfSpeech={entry.part_of_speech}
            rawForms={entry.forms}
          />
        </>

        {entry.etymology && (
          <>
            <Separator />
            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">Etymology</h2>
              <p className="text-lg leading-relaxed">{entry.etymology}</p>
            </section>
          </>
        )}
      </article>
    </div>
  );
}

/**
 * Word pronunciation.
 */
function WordPronunciation(properties: WordPronunciationProperties): ReactNode {
  const { pronunciation, wordText } = properties;
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold">Pronunciation</h2>
      <div className="space-y-3">
        {pronunciation.classical?.phonetic && (
          <div className="flex items-center gap-3">
            <span className="min-w-32 font-medium text-muted-foreground">
              Classical:
            </span>
            <span className="font-mono text-lg">
              {pronunciation.classical.phonetic}
            </span>
            <PronunciationButton
              dialect="classical"
              text={wordText}
            />
          </div>
        )}
        {pronunciation.ecclesiastical?.phonetic && (
          <div className="flex items-center gap-3">
            <span className="min-w-32 font-medium text-muted-foreground">
              Ecclesiastical:
            </span>
            <span className="font-mono text-lg">
              {pronunciation.ecclesiastical.phonetic}
            </span>
            <PronunciationButton
              dialect="ecclesiastical"
              text={wordText}
            />
          </div>
        )}
      </div>
    </section>
  );
}
