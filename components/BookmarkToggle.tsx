"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type BookmarkToggleProps = {
  sourceType: "mock" | "subject";
  sourceKey: string;
  questionNumber: number;
};

type BookmarkResponse = {
  data?: { bookmarked?: boolean };
  error?: string;
};

type BookmarkRecord = {
  source_type: "mock" | "subject";
  source_key: string;
  question_number: number;
};

type BookmarkState = {
  loading: boolean;
  unauthenticated: boolean;
  isBookmarked: (sourceType: "mock" | "subject", sourceKey: string, questionNumber: number) => boolean;
  setBookmarked: (sourceType: "mock" | "subject", sourceKey: string, questionNumber: number, value: boolean) => void;
};

const BookmarkStateContext = createContext<BookmarkState | null>(null);

function bookmarkKey(sourceType: "mock" | "subject", sourceKey: string, questionNumber: number) {
  return `${sourceType}:${sourceKey}:${questionNumber}`;
}

export function BookmarkStateProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/bookmarks", { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json().catch(() => ({})) as { data?: BookmarkRecord[] } }))
      .then(({ response, body }) => {
        if (!active) return;
        if (response.status === 401) {
          setUnauthenticated(true);
          return;
        }
        if (!response.ok) return;
        setBookmarks(Object.fromEntries((body.data || []).map((bookmark) => [bookmarkKey(bookmark.source_type, bookmark.source_key, bookmark.question_number), true])));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <BookmarkStateContext.Provider value={{
    loading,
    unauthenticated,
    isBookmarked: (sourceType, sourceKey, questionNumber) => Boolean(bookmarks[bookmarkKey(sourceType, sourceKey, questionNumber)]),
    setBookmarked: (sourceType, sourceKey, questionNumber, value) => {
      const key = bookmarkKey(sourceType, sourceKey, questionNumber);
      setBookmarks((current) => {
        const next = { ...current };
        if (value) next[key] = true; else delete next[key];
        return next;
      });
    },
  }}>{children}</BookmarkStateContext.Provider>;
}

export function BookmarkToggle({ sourceType, sourceKey, questionNumber }: BookmarkToggleProps) {
  const sharedState = useContext(BookmarkStateContext);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sharedState) return;
    let active = true;
    const params = new URLSearchParams({
      source_type: sourceType,
      source_key: sourceKey,
      question_number: String(questionNumber),
    });

    setLoading(true);
    setError("");
    setUnauthenticated(false);
    fetch(`/api/bookmarks?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json().catch(() => ({})) as BookmarkResponse }))
      .then(({ response, body }) => {
        if (!active) return;
        if (response.status === 401) {
          setUnauthenticated(true);
          return;
        }
        if (!response.ok) throw new Error(body.error || "Unable to load bookmark status.");
        setBookmarked(Boolean(body.data?.bookmarked));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load bookmark status.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [questionNumber, sharedState, sourceKey, sourceType]);

  const toggleBookmark = async () => {
    setSaving(true);
    setError("");
    try {
      const currentState = sharedState ? sharedState.isBookmarked(sourceType, sourceKey, questionNumber) : bookmarked;
      const response = await fetch("/api/bookmarks", {
        method: currentState ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: sourceType,
          source_key: sourceKey,
          question_number: questionNumber,
        }),
      });
      const body = await response.json().catch(() => ({})) as BookmarkResponse;
      if (!response.ok) throw new Error(body.error || "Unable to update bookmark.");
      if (sharedState) sharedState.setBookmarked(sourceType, sourceKey, questionNumber, !currentState);
      else setBookmarked((value) => !value);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update bookmark.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`btn-secondary !py-2 text-sm ${bookmarked ? "!bg-brand-50 !text-brand-700" : ""}`}
        disabled={(sharedState ? sharedState.loading : loading) || saving || (sharedState ? sharedState.unauthenticated : unauthenticated)}
        onClick={toggleBookmark}
        aria-pressed={bookmarked}
      >
        {(sharedState ? sharedState.loading : loading) ? "Loading…" : (sharedState ? sharedState.unauthenticated : unauthenticated) ? "Sign in to save" : saving ? "Saving…" : (sharedState ? sharedState.isBookmarked(sourceType, sourceKey, questionNumber) : bookmarked) ? "Saved" : "Save question"}
      </button>
      {error && <p className="text-xs text-rose-600" role="status">{error}</p>}
    </div>
  );
}
