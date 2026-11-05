import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { requestExpenseExport, saveBlob, type ExportFormat } from "@/lib/expense-export";

/** CSV/PDF export of the active scope's recorded expenses. */
export function ExportButtons({ workspaceId }: { workspaceId: number | null }) {
  const [pending, setPending] = useState<ExportFormat | null>(null);

  const run = async (format: ExportFormat) => {
    setPending(format);
    try {
      const { blob, filename } = await requestExpenseExport(format, workspaceId);
      saveBlob(blob, filename);
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Export expenses">
      {(["csv", "pdf"] as const).map(format => (
        <button
          key={format}
          type="button"
          onClick={() => run(format)}
          disabled={pending !== null}
          aria-busy={pending === format}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          {pending === format ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Download size={14} aria-hidden />}
          Export {format.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
