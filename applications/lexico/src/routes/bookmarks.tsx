import { createFileRoute, Link } from "@tanstack/react-router";
import { noop } from "lodash";
import { Bookmark, BookmarkX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@codebase/components-web";

import { EntryCard } from "../components/entry/entry-card";
import { getBookmarks, removeBookmark } from "../lib/bookmarks";

import type { BookmarkedEntry } from "../lib/bookmarks";
import type { ReactNode } from "react";

export const Route = createFileRoute("/bookmarks")({
  component: BookmarksPage,
});

// 📚 Bookmark list sub-components

/**
 * Bookmark item props.
 */
interface BookmarkItemProperties {
  entry: BookmarkedEntry;
  onRemove: (entryId: string) => void;
}

/**
 * Bookmarks list props.
 */
interface BookmarksListProperties {
  bookmarks: BookmarkedEntry[];
  onRemove: (entryId: string) => void;
}

/**
 * Bookmark item.
 */
function BookmarkItem(properties: BookmarkItemProperties): ReactNode {
  const { entry, onRemove } = properties;
  return (
    <div className="group relative">
      <Link
        className="block transition-transform hover:scale-[1.01]"
        params={{ id: entry.id }}
        to="/word/$id"
      >
        <EntryCard
          id={entry.id}
          inflection={entry.inflection}
          onBookmarkToggle={noop}
          partOfSpeech={entry.part_of_speech}
          principalParts={entry.principal_parts}
          translations={entry.translations}
          bookmarked
        />
      </Link>
      <Button
        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(event) => {
          event.preventDefault();
          onRemove(entry.id);
        }}
        size="icon"
        title="Remove bookmark"
        variant="ghost"
      >
        <BookmarkX className="h-5 w-5 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  );
}

/**
 * Bookmarks list.
 */
function BookmarksList(properties: BookmarksListProperties): ReactNode {
  const { bookmarks, onRemove } = properties;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {bookmarks.map((entry) => (
        <BookmarkItem
          key={entry.id}
          entry={entry}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

/**
 * Bookmarks page component that displays user's bookmarked entries.
 *
 * @returns React node.
 */
function BookmarksPage(): ReactNode {
  const [bookmarks, setBookmarks] = useState<BookmarkedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  const fetchBookmarks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBookmarks();
      setBookmarks(data);
    } catch (error_: unknown) {
      const message =
        error_ instanceof Error ? error_.message : "Failed to load bookmarks";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBookmarks();
  }, [fetchBookmarks]);

  const handleRemoveBookmark = useCallback(async (entryId: string) => {
    try {
      const result = await removeBookmark({ data: { entryId } });
      if (result.success) {
        setBookmarks((previous) => previous.filter((b) => b.id !== entryId));
      }
    } catch (error_) {
      console.error("Failed to remove bookmark:", error_);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bookmark className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Bookmarks</h1>
      </div>

      {isLoading && (
        <div className="text-center text-muted-foreground">
          <p>Loading bookmarks...</p>
        </div>
      )}

      {error && (
        <div className="text-center text-destructive">
          <p>Error: {error}</p>
        </div>
      )}

      {!isLoading && !error && bookmarks.length > 0 && (
        <BookmarksList
          bookmarks={bookmarks}
          onRemove={(entryId) => void handleRemoveBookmark(entryId)}
        />
      )}

      {!isLoading && !error && bookmarks.length === 0 && <EmptyBookmarks />}
    </div>
  );
}

/**
 * Empty bookmarks.
 */
function EmptyBookmarks(): ReactNode {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>No Bookmarks Yet</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        <p>
          Your bookmarked Latin words will appear here. Save words while
          searching to build your vocabulary list.
        </p>
        <div className="mt-4">
          <Link to="/search">
            <Button variant="outline">Start Searching</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
