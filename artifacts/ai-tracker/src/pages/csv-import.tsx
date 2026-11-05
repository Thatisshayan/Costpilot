import { useState } from "react";
import { Link } from "wouter";
import Papa from "papaparse";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Eye, FileUp, Info, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  getListImportsQueryKey, useCreateImport, useListImports, usePreviewImport, useUndoImport,
  type ImportPreview, type ImportRow, type ImportRowResult,
} from "@workspace/api-client-react";
import { useWorkspace } from "@/context/workspace-context";
import { apiErrorMessage } from "@/lib/api-error";
import { currencyOptions } from "@/lib/expense-form";
import { buildRows, FIELD_LABEL, FIELDS, guessMapping, mappingIssues, MAX_FILE_BYTES, MAX_ROWS, REQUIRED, type Field, type Mapping } from "@/lib/csv-mapping";

const field = "w-full bg-white/[0.03] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50";
const label = "block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5";
const STATUS_LABEL: Record<ImportRowResult["status"], string> = {
  valid: "Ready", invalid: "Error", already_imported: "Already imported", possible_duplicate: "Possible duplicate",
};

type Parsed = { fileName: string; headers: string[]; records: Record<string, string>[] };

/** Reads a CSV file in the browser; size and row limits are checked before anything is sent. */
export function parseCsvFile(file: File): Promise<Parsed> {
  return new Promise((resolve, reject) => {
    if (!/\.csv$/i.test(file.name)) { reject(new Error("Choose a .csv file.")); return; }
    if (file.size > MAX_FILE_BYTES) { reject(new Error("The file is larger than 1 MB. Split it into smaller files.")); return; }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: h => h.trim(),
      complete: results => {
        const headers = (results.meta.fields ?? []).filter(Boolean);
        if (headers.length === 0) { reject(new Error("The file has no header row.")); return; }
        if (results.data.length === 0) { reject(new Error("The file has no data rows.")); return; }
        if (results.data.length > MAX_ROWS) { reject(new Error(`The file has ${results.data.length} rows; import at most ${MAX_ROWS} at a time.`)); return; }
        resolve({ fileName: file.name, headers, records: results.data });
      },
      error: error => reject(new Error(`The file could not be read: ${error.message}`)),
    });
  });
}

function ImportHistory({ canWrite, workspaceId }: { canWrite: boolean; workspaceId: number | null }) {
  const params = workspaceId !== null ? { workspaceId } : {};
  const query = useListImports(params);
  const undo = useUndoImport();
  const cache = useQueryClient();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const batches = query.data ?? [];
  if (query.isError) return <p role="alert" className="text-sm text-amber-200">Import history could not be loaded: {apiErrorMessage(query.error, "please try again.")}</p>;
  if (batches.length === 0) return null;
  const run = async (id: number) => {
    try {
      const result = await undo.mutateAsync({ id });
      toast.success(`Import undone: ${result.deletedCount} ${result.deletedCount === 1 ? "expense" : "expenses"} removed.`);
      await cache.invalidateQueries();
    } catch (error) {
      toast.error(apiErrorMessage(error, "The import could not be undone."));
    } finally {
      setConfirmId(null);
    }
  };
  return (
    <section aria-labelledby="import-history" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6">
      <h2 id="import-history" className="text-lg font-semibold text-white mb-3">Recent imports</h2>
      <ul className="divide-y divide-white/[0.06]">
        {batches.map(b => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-white break-all">{b.fileName}</p>
              <p className="text-xs text-slate-300">
                {new Date(b.createdAt).toLocaleString()} · {b.insertedCount} imported, {b.skippedCount} skipped
                {b.undoneAt ? ` · undone ${new Date(b.undoneAt).toLocaleString()}` : ""}
              </p>
            </div>
            {canWrite && !b.undoneAt && (confirmId === b.id ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-300">Remove the {b.insertedCount} expenses from this import, including any you edited since?</span>
                <button type="button" onClick={() => void run(b.id)} className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-semibold text-white">Undo import</button>
                <button type="button" onClick={() => setConfirmId(null)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100">Keep</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmId(b.id)} aria-label={`Undo import ${b.fileName}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100"><Undo2 size={12} aria-hidden /> Undo</button>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RowReport({ preview, confirmed, onToggle }: { preview: ImportPreview; confirmed: Set<number>; onToggle: (row: number) => void }) {
  const flagged = preview.rows.filter(r => r.status !== "valid");
  return (
    <section aria-labelledby="row-report" className="space-y-3">
      <h2 id="row-report" className="text-lg font-semibold text-white">Check the rows</h2>
      <ul className="flex flex-wrap gap-2 text-xs" aria-label="Row counts">
        <li className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-emerald-200">{preview.counts.valid} ready</li>
        <li className="rounded-lg bg-red-500/10 px-3 py-1.5 text-red-200">{preview.counts.invalid} with errors (skipped)</li>
        <li className="rounded-lg bg-white/5 px-3 py-1.5 text-slate-200">{preview.counts.already_imported} already imported (skipped)</li>
        <li className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-amber-200">{preview.counts.possible_duplicate} possible duplicates</li>
      </ul>
      {flagged.length > 0 && (
        <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          {flagged.map(r => (
            <li key={r.rowNumber} className="p-3 text-sm">
              <p className="font-semibold text-white">Line {r.rowNumber}: {STATUS_LABEL[r.status]}</p>
              <ul className="mt-1 list-disc pl-5 text-slate-300">{r.messages.map(m => <li key={m}>{m}</li>)}</ul>
              {r.status === "possible_duplicate" && (
                <label className="mt-2 flex items-center gap-2 text-slate-100">
                  <input type="checkbox" checked={confirmed.has(r.rowNumber)} onChange={() => onToggle(r.rowNumber)} />
                  Import line {r.rowNumber} anyway (it is a separate charge)
                </label>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function CsvImport() {
  const { activeWorkspaceId, activeWorkspace, canWrite, activeRole } = useWorkspace();
  const cache = useQueryClient();
  const previewImport = usePreviewImport();
  const createImport = useCreateImport();
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [fixedCurrency, setFixedCurrency] = useState("");
  const [preview, setPreview] = useState<{ rows: ImportRow[]; result: ImportPreview } | null>(null);
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  const [serverError, setServerError] = useState<string | null>(null);
  const scopeName = activeWorkspaceId === null ? "Personal" : activeWorkspace?.name ?? "Workspace";
  const issues = mapping ? mappingIssues(mapping, fixedCurrency) : [];
  const scope = activeWorkspaceId !== null ? { workspaceId: activeWorkspaceId } : {};

  const reset = () => { setParsed(null); setMapping(null); setPreview(null); setConfirmed(new Set()); setServerError(null); setFixedCurrency(""); };

  const onFile = async (file: File | undefined) => {
    reset();
    setFileError(null);
    if (!file) return;
    try {
      const result = await parseCsvFile(file);
      setParsed(result);
      setMapping(guessMapping(result.headers));
    } catch (error) {
      setFileError((error as Error).message);
    }
  };

  const check = async () => {
    if (!parsed || !mapping || issues.length > 0) return;
    const rows = buildRows(parsed.records, mapping, fixedCurrency);
    try {
      const result = await previewImport.mutateAsync({ data: { ...scope, fileName: parsed.fileName, rows } });
      setPreview({ rows, result });
      setConfirmed(new Set());
      setServerError(null);
    } catch (error) {
      setServerError(apiErrorMessage(error, "The file could not be checked."));
    }
  };

  const runImport = async () => {
    if (!parsed || !preview) return;
    try {
      const result = await createImport.mutateAsync({ data: { ...scope, fileName: parsed.fileName, rows: preview.rows, confirmDuplicateRows: [...confirmed] } });
      await cache.invalidateQueries();
      toast.success(result.insertedCount === 0
        ? "Nothing was imported: every row was skipped."
        : `Imported ${result.insertedCount} ${result.insertedCount === 1 ? "expense" : "expenses"} into ${scopeName}; ${result.skippedCount} skipped.`);
      reset();
    } catch (error) {
      setServerError(apiErrorMessage(error, "The import failed; nothing was saved."));
    }
  };

  const importable = preview ? preview.result.counts.valid + confirmed.size : 0;

  return (
    <div className="pb-20 space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Import expenses</h1>
        <p className="text-sm text-slate-300 mt-1">Upload a CSV export from a provider console, card statement or spreadsheet. Rows are added to <strong className="text-white">{scopeName}</strong>; use the workspace switcher to import elsewhere.</p>
      </header>

      <p className="text-xs text-slate-300 flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5" aria-hidden />
        <span>
          Amounts are imported exactly as written, in their own currency; negative amounts are refunds or credits. Nothing is converted, estimated or filled in:
          a row with a missing or unreadable value is reported and skipped. Vendors and projects must already exist in {scopeName}. A transaction ID prevents the same row being imported twice.
          Imported expenses are labelled "CSV import" and can be undone. Up to {MAX_ROWS} rows and 1 MB per file.
        </span>
      </p>

      {!canWrite ? (
        <p className="text-sm text-slate-300 flex items-center gap-2"><Eye size={14} aria-hidden /> Your {activeRole ?? "current"} role cannot import into this workspace. Ask an owner or admin.</p>
      ) : (
        <section aria-labelledby="choose-file" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6 space-y-4">
          <h2 id="choose-file" className="text-lg font-semibold text-white">1. Choose a file</h2>
          <div>
            <label htmlFor="csv-file" className={label}>CSV file</label>
            <input id="csv-file" type="file" accept=".csv,text/csv" onChange={e => void onFile(e.target.files?.[0])}
              aria-invalid={fileError ? true : undefined} aria-describedby={fileError ? "csv-file-error" : undefined}
              className="block w-full text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:font-semibold file:text-white" />
            {fileError && <p id="csv-file-error" className="mt-1 text-xs text-red-300">{fileError}</p>}
          </div>

          {parsed && mapping && (
            <>
              <h2 className="text-lg font-semibold text-white">2. Match the columns</h2>
              <p className="text-sm text-slate-300">{parsed.fileName}: {parsed.records.length} {parsed.records.length === 1 ? "row" : "rows"}. Required: {REQUIRED.map(f => FIELD_LABEL[f]).join(", ")} and a currency.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {FIELDS.map((f: Field) => (
                  <div key={f}>
                    <label htmlFor={`map-${f}`} className={label}>{FIELD_LABEL[f]}{REQUIRED.includes(f) ? " (required)" : ""}</label>
                    <select id={`map-${f}`} className={field} value={mapping[f]} onChange={e => { setMapping({ ...mapping, [f]: e.target.value }); setPreview(null); }}>
                      <option value="" className="bg-zinc-950">{f === "currency" ? "Same currency for every row" : "Not in this file"}</option>
                      {parsed.headers.map(h => <option key={h} value={h} className="bg-zinc-950">{h}</option>)}
                    </select>
                  </div>
                ))}
                {!mapping.currency && (
                  <div>
                    <label htmlFor="fixed-currency" className={label}>Currency of every row</label>
                    <select id="fixed-currency" className={field} value={fixedCurrency} onChange={e => { setFixedCurrency(e.target.value); setPreview(null); }}>
                      <option value="" className="bg-zinc-950">Choose…</option>
                      {currencyOptions(fixedCurrency || null).map(code => <option key={code} value={code} className="bg-zinc-950">{code}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {issues.length > 0 && <ul className="list-disc pl-5 text-xs text-amber-200">{issues.map(i => <li key={i}>{i}</li>)}</ul>}
              <button type="button" onClick={() => void check()} disabled={issues.length > 0 || previewImport.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                <FileUp size={16} aria-hidden /> {previewImport.isPending ? "Checking…" : "Check rows"}
              </button>
            </>
          )}

          {preview && (
            <>
              <RowReport preview={preview.result} confirmed={confirmed}
                onToggle={row => setConfirmed(prev => { const next = new Set(prev); if (next.has(row)) next.delete(row); else next.add(row); return next; })} />
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => void runImport()} disabled={importable === 0 || createImport.isPending}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {createImport.isPending ? "Importing…" : `Import ${importable} ${importable === 1 ? "row" : "rows"} into ${scopeName}`}
                </button>
                <button type="button" onClick={reset} className="rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100">Start over</button>
              </div>
            </>
          )}
          {serverError && (
            <p role="alert" className="flex items-center gap-2 text-sm text-red-300"><AlertTriangle size={14} aria-hidden /> {serverError}</p>
          )}
        </section>
      )}

      <ImportHistory canWrite={canWrite} workspaceId={activeWorkspaceId} />
      <Link href="/expenses" className="inline-block text-sm font-semibold text-indigo-300 underline">View expenses</Link>
    </div>
  );
}
