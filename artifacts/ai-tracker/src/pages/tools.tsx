import { useListTools } from "@workspace/api-client-react";
import { ExternalLink, Pin, Folder, Blocks, Globe } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";

export default function Tools() {
  const { data: tools, isLoading } = useListTools();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Tools & Websites</h1>
          <p className="text-sm text-slate-400 mt-1">Access bookmarked project dashboards and internal AI tools.</p>
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Loading tools...</div>
      ) : tools && tools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div 
              key={tool.id} 
              className={`bg-white/[0.02] border rounded-2xl p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.04] flex flex-col justify-between h-[220px] relative ${
                tool.isPinned 
                  ? "border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.05)] bg-gradient-to-b from-indigo-500/[0.02] to-transparent" 
                  : "border-white/[0.06]"
              }`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white text-lg flex items-center gap-2 leading-tight">
                      {tool.name}
                      {tool.isPinned && <Pin size={14} className="text-indigo-400 fill-indigo-400/20 shrink-0" />}
                    </h3>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-2 items-center font-medium">
                      {tool.projectName && (
                        <span className="flex items-center gap-1">
                          <Folder size={12} className="text-slate-500" />
                          {tool.projectName}
                        </span>
                      )}
                      {tool.projectName && tool.platformName && <span className="text-slate-600">•</span>}
                      {tool.platformName && (
                        <span className="flex items-center gap-1">
                          <Blocks size={12} className="text-slate-500" />
                          {tool.platformName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  {tool.category && (
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-white/[0.04] border border-white/[0.08] text-indigo-300">
                      {tool.category}
                    </span>
                  )}
                  {tool.description && (
                    <p className="text-sm text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                      {tool.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-white/[0.04] pt-4 mt-auto">
                <a 
                  href={tool.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs font-medium text-indigo-400 flex items-center gap-1 hover:text-indigo-300 transition-colors w-max"
                >
                  <ExternalLink size={12} />
                  {tool.url.replace(/^https?:\/\//, "").split("/")[0]}
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Globe size={28} />}
          title="No tools bookmarked yet"
          description="Bookmark your AI tools and dashboards to access them quickly from one place."
          action={{ label: "Browse Integrations", onClick: () => {} }}
        />
      )}
    </div>
  );
}
