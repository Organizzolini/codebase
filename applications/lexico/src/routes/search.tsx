import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { noop } from "lodash";
import {
  useCallback,
  useEffect,
  useRef as useReference,
  useState,
} from "react";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@codebase/components-web";

import { EntryCard } from "../components/entry/entry-card";
import { transformForms } from "../lib/forms";
import { searchEntries } from "../lib/search";

import type { EntrySearchResult } from "../lib/types";
import type { ReactNode } from "react";

const searchSchema = z.object({
  query: z.string().optional(),
});

// 🧭 Route

/**
 * Searches the dictionary by English or Latin query.
 */
export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: searchSchema,
});

// 🔍 Search results sub-components

/**
 * Empty results props.
 */
interface EmptyResultsProperties {
  query: string;
}

/**
 * Search results list props.
 */
interface SearchResultsListProperties {
  results: EntrySearchResult[];
}

/**
 * Empty results.
 */
function EmptyResults(properties: EmptyResultsProperties): ReactNode {
  const { query } = properties;
  return (
    <div className="text-center text-muted-foreground">
      <p>No results found for &quot;{query}&quot;</p>
    </div>
  );
}

// 🧩 Component

/**
 * Search page component that allows users to search for Latin entries.
 *
 * @returns React node.
 */
function SearchPage(): ReactNode {
  // 🪝 Hooks
  const navigate = useNavigate({ from: "/search" });
  const { query: urlQuery } = Route.useSearch();
  const [query, setQuery] = useState<string>(urlQuery ?? "");
  const [results, setResults] = useState<EntrySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const inputReference = useReference<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Select all text in the input on mount
  useEffect(() => {
    if (inputReference.current) {
      inputReference.current.select();
    }
  }, [inputReference]);

  // Update URL when debounced query changes
  useEffect(() => {
    if (debouncedQuery !== urlQuery) {
      void navigate({
        replace: true,
        search: debouncedQuery ? { query: debouncedQuery } : {},
      });
    }
  }, [debouncedQuery, urlQuery, navigate]);

  // 🏗 Setup
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchResults = await searchEntries({
        data: { language: "auto", query: searchQuery },
      });
      setResults(searchResults);
    } catch (error_: unknown) {
      const message =
        error_ instanceof Error ? error_.message : "Search failed";
      setError(message);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // 💪 Handlers

  // ♻️ Lifecycle

  // 🏁 Early Returns

  // 🎨 Markup
  return (
    <section className="space-y-6">
      <h1 className="sr-only">Search</h1>
      <div className="mx-auto max-w-2xl">
        <Input
          ref={inputReference}
          className="w-full text-lg"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search Latin or English..."
          type="search"
          value={query}
        />
      </div>

      {isLoading && (
        <div className="text-center text-muted-foreground">
          <p>Searching...</p>
        </div>
      )}

      {error && (
        <div className="text-center text-destructive">
          <p>Error: {error}</p>
        </div>
      )}

      {!isLoading && !error && results.length > 0 && (
        <SearchResultsList results={results} />
      )}

      {!isLoading && !error && query && results.length === 0 && (
        <EmptyResults query={query} />
      )}

      {!query && <WelcomeCard />}
    </section>
  );
}

/**
 * Search results list.
 */
function SearchResultsList(properties: SearchResultsListProperties): ReactNode {
  const { results } = properties;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {results.map((entry) => {
        const transformedForms = transformForms(
          entry.part_of_speech,
          entry.forms,
        );

        return (
          <div key={entry.id}>
            <EntryCard
              etymology={entry.etymology}
              forms={transformedForms}
              id={entry.id}
              inflection={entry.inflection}
              onBookmarkToggle={noop}
              partOfSpeech={entry.part_of_speech}
              principalParts={entry.principal_parts}
              pronunciation={entry.pronunciation}
              translations={entry.translations}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Custom hook that debounces a value by the specified delay.
 *
 * @param value - Value to debounce.
 * @param delay - Delay in milliseconds.
 * @returns Debounced value.
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Welcome card.
 */
function WelcomeCard(): ReactNode {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Welcome to Lexico</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        <p>
          Start typing to search the Latin dictionary. You can search for Latin
          words to find their English translations, or search for English words
          to find Latin equivalents.
        </p>
        <ul className="mt-4 list-inside list-disc space-y-1">
          <li>
            Search Latin words (e.g., &quot;amo&quot;, &quot;rex&quot;,
            &quot;bellum&quot;)
          </li>
          <li>
            Search English translations (e.g., &quot;love&quot;,
            &quot;king&quot;, &quot;war&quot;)
          </li>
          <li>View word forms, conjugations, and declensions</li>
        </ul>
      </CardContent>
    </Card>
  );
}
