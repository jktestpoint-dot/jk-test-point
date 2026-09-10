"use client";

import { useEffect, useState } from "react";

type SavedQuestion = {
  id: string;
  source_type: "mock" | "subject";
  source_key: string;
  question_number: number;
  created_at: string;
  source_label: string;
  question: { text: string; options: string[] } | null;
};

export function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<SavedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/bookmarks", { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json().catch(() => ({})) as { data?: SavedQuestion[]; error?: string } }))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body.error || "Unable to load saved questions.");
        if (active) setBookmarks(Array.isArray(body.data) ? body.data : []);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load saved questions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const removeBookmark = async (bookmark: SavedQuestion) => {
    setRemovingId(bookmark.id);
    setError("");
    try {
      const response = await fetch("/api/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: bookmark.source_type,
          source_key: bookmark.source_key,
          question_number: bookmark.question_number,
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to remove saved question.");
      setBookmarks((current) => current.filter((item) => item.id !== bookmark.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to remove saved question.");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return <section className="container-page py-10"><div className="card text-center text-stone-500">Loading saved questions…</div></section>;

  return <section className="container-page py-10">
    <div className="page-intro">
      <p className="eyebrow">Your practice library</p>
      <h1 className="mt-2 text-3xl font-bold">Saved Questions</h1>
      <p className="mt-3 max-w-2xl text-stone-600">Keep important questions together and revisit them whenever you want to practise.</p>
    </div>
    {error && <div className="card mt-6 text-rose-700" role="status">{error}</div>}
    {!bookmarks.length ? <div className="card mt-7 text-center"><h2 className="text-xl font-bold">No saved questions yet</h2><p className="mt-2 text-sm text-stone-600">Save questions while practising to revisit them here.</p></div> : <div className="mt-7 space-y-4">
      {bookmarks.map((bookmark) => <article className="card" key={bookmark.id}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-wide text-brand-600">{bookmark.source_type === "mock" ? "Mock test" : "Subject practice"}</p><h2 className="mt-1 font-bold">{bookmark.source_label}</h2><p className="mt-1 text-sm text-stone-500">Question {bookmark.question_number} · Saved {new Date(bookmark.created_at).toLocaleDateString()}</p></div>
          <button className="btn-secondary !py-2" disabled={removingId === bookmark.id} onClick={() => removeBookmark(bookmark)}>{removingId === bookmark.id ? "Removing…" : "Remove"}</button>
        </div>
        {bookmark.question ? <><p className="mt-5 font-semibold leading-7">{bookmark.question.text}</p><div className="mt-4 space-y-2">{bookmark.question.options.map((option, index) => <p className="rounded-lg border border-stone-100 p-3 text-sm text-stone-700" key={`${bookmark.id}-${index}`}><b className="mr-2 text-brand-600">{String.fromCharCode(65 + index)}.</b>{option}</p>)}</div></> : <p className="mt-5 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">This question is no longer available to your account. You can remove the saved item.</p>}
      </article>)}
    </div>}
  </section>;
}
