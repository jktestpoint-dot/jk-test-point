"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogTest } from "@/lib/mock-test-types";

type PreviewRow = { source_row: number; question_number: number; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string; explanation: string | null };
type Preview = { test: Pick<CatalogTest, "id" | "title" | "main_category" | "subcategory">; existingCount: number; detected: number; validRowCount: number; failedRowCount: number; duplicateCount: number; errors: string[]; rows: PreviewRow[]; totalAfterAppend: number };
const template = "question_number,question_text,option_a,option_b,option_c,option_d,correct_option,explanation\n1,Sample question,Option A,Option B,Option C,Option D,A,Explanation\n";

export function AdminAppendMockQuestions() {
  const [tests, setTests] = useState<CatalogTest[]>([]);
  const [testId, setTestId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingTests, setLoadingTests] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const selectedTest = useMemo(() => tests.find((test) => test.id === testId), [tests, testId]);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/questions/append", { cache: "no-store" }).then(async (response) => {
      const body = await response.json().catch(() => ({})) as { data?: CatalogTest[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load mock tests.");
      if (active) setTests(Array.isArray(body.data) ? body.data : []);
    }).catch((error: unknown) => {
      if (active) { setIsError(true); setMessage(error instanceof Error ? error.message : "Unable to load mock tests."); }
    }).finally(() => { if (active) setLoadingTests(false); });
    return () => { active = false; };
  }, []);

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([template], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "mock-question-append-template.csv"; link.click(); URL.revokeObjectURL(url);
  };

  const request = async (action: "preview" | "append") => {
    if (!testId || !file) { setIsError(true); setMessage("Select an existing mock and a CSV/XLSX file first."); return; }
    if (action === "append" && (!preview || preview.errors.length || preview.validRowCount === 0)) return;
    if (action === "append" && !window.confirm(`Append ${preview?.validRowCount ?? 0} new questions to ${selectedTest?.title}? Existing questions will remain unchanged. Mock settings, price and access rules will not be modified.`)) return;
    setBusy(true); setMessage(""); setIsError(false);
    const form = new FormData(); form.set("action", action); form.set("testId", testId); form.set("file", file);
    try {
      const response = await fetch("/api/admin/questions/append", { method: "POST", body: form });
      const body = await response.json().catch(() => ({})) as { data?: Preview & { imported?: number; skipped?: number; existingBefore?: number; totalAfterAppend?: number; testTitle?: string }; error?: string; errors?: string[] };
      if (action === "preview" && body.data) setPreview(body.data);
      if (!response.ok) {
        setIsError(true); setMessage(body.error || "Question append request failed.");
        if (action === "append" && body.data) setPreview(body.data);
        return;
      }
      if (action === "preview") setMessage("Preview is ready. Confirm only after checking the questions and import summary.");
      else {
        setMessage(`Appended ${body.data?.imported ?? 0} questions to ${body.data?.testTitle ?? selectedTest?.title}. Existing questions were preserved. Total questions: ${body.data?.totalAfterAppend ?? "updated"}.`);
        setPreview(null); setFile(null);
      }
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : "Question append request failed."); }
    finally { setBusy(false); }
  };

  const errorsByRow = (sourceRow: number) => (preview?.errors || []).filter((error) => error.startsWith(`Row ${sourceRow}:`));
  return <section className="container-page py-10"><div className="max-w-6xl"><p className="eyebrow">Administrator</p><h1 className="mt-2 text-3xl font-bold">Add Questions to Existing Mock</h1><p className="mt-2 text-stone-500">Append new questions to an existing mock. Existing questions and all mock settings remain unchanged.</p>
    <div className="card mt-6 space-y-5"><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Existing mock<select className="input mt-1" value={testId} onChange={(event) => { setTestId(event.target.value); setPreview(null); setMessage(""); }} disabled={loadingTests}><option value="">{loadingTests ? "Loading mocks…" : "Select a mock test"}</option>{tests.map((test) => <option key={test.id} value={test.id}>{test.main_category} · {test.subcategory} · {test.title}</option>)}</select></label><label className="text-sm font-medium">CSV/XLSX questions<input className="input mt-1" type="file" accept=".csv,.xlsx" onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null); }} /></label></div>
      {selectedTest && <div className="rounded-lg bg-stone-50 p-3 text-sm">Selected: <b>{selectedTest.title}</b> ({selectedTest.id}) · Current catalogue count: <b>{selectedTest.question_count}</b> · Price: <b>₹{selectedTest.price}</b>. These settings will not be edited.</div>}
      <p className="text-xs text-stone-500">CSV columns: question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation. XLSX is also supported. New question numbers are assigned after the current highest question number.</p>
      <div className="flex flex-wrap gap-3"><button className="btn-secondary" type="button" onClick={downloadTemplate}>Download CSV template</button><button className="btn-primary" type="button" disabled={busy || !testId || !file} onClick={() => request("preview")}>{busy ? "Validating…" : "Validate & preview"}</button>{preview && <button className="btn-primary" type="button" disabled={busy || !!preview.errors.length || preview.validRowCount === 0} onClick={() => request("append")}>{busy ? "Appending…" : "Confirm & append"}</button>}</div>
      {message && <p role="status" className={`rounded-lg p-3 text-sm font-medium ${isError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{message}</p>}
      {preview && <><div className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm"><p className="font-bold">Import summary · {preview.test.title}</p><p className="mt-1">Existing questions: <b>{preview.existingCount}</b> · New detected: <b>{preview.detected}</b> · Valid to append: <b>{preview.validRowCount}</b> · Failed: <b>{preview.failedRowCount}</b> · Duplicate questions: <b>{preview.duplicateCount}</b> · Total after append: <b>{preview.totalAfterAppend}</b></p></div>
        {preview.errors.length > 0 && <ul className="list-disc space-y-1 rounded-lg bg-rose-50 p-4 pl-8 text-sm text-rose-800">{preview.errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul>}
        {preview.rows.length > 0 && <div className="overflow-x-auto rounded-lg border border-stone-200"><table className="min-w-[900px] w-full text-left text-xs"><thead className="bg-stone-50"><tr><th className="p-2">New #</th><th className="p-2">Question</th><th className="p-2">Options A–D</th><th className="p-2">Correct</th><th className="p-2">Explanation</th><th className="p-2">Validation</th></tr></thead><tbody>{preview.rows.map((row) => { const rowErrors = errorsByRow(row.source_row); return <tr key={`${row.source_row}-${row.question_number}`} className="border-t border-stone-100 align-top"><td className="p-2 font-medium">{row.question_number}</td><td className="max-w-sm whitespace-pre-wrap p-2">{row.question_text}</td><td className="p-2"><div>A. {row.option_a}</div><div>B. {row.option_b}</div><div>C. {row.option_c}</div><div>D. {row.option_d}</div></td><td className="p-2 font-semibold">{row.correct_option}</td><td className="max-w-sm whitespace-pre-wrap p-2">{row.explanation || "—"}</td><td className="p-2 text-rose-700">{rowErrors.length ? rowErrors.join(" ") : "Ready"}</td></tr>; })}</tbody></table></div>}</>}
    </div></div></section>;
}
