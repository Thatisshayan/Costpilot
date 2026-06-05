import { useListProjects } from "@workspace/api-client-react";
import { Folder, FolderOpen } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>
          <p className="text-sm text-slate-400 mt-1">Track and organize API costs grouped by individual software products.</p>
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Loading projects...</div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.04] flex flex-col justify-between h-[180px] relative overflow-hidden"
            >
              {/* Top Accent Strip using project custom color */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5" 
                style={{ backgroundColor: project.color || "#6366f1" }} 
              />
              
              <div className="mt-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-white text-lg flex items-center gap-2 leading-tight">
                    <Folder size={18} className="text-slate-400 shrink-0" />
                    {project.name}
                  </h3>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg ${
                    project.status === "active" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-white/[0.04] text-slate-400 border border-white/[0.08]"
                  }`}>
                    {project.status || "unknown"}
                  </span>
                </div>

                <p className="text-sm text-slate-400 mt-4 line-clamp-3 leading-relaxed">
                  {project.description || <span className="text-slate-600 italic">No description provided.</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderOpen size={28} />}
          title="No projects yet"
          description="Create your first project to start tracking AI spend by product or team."
          action={{ label: "Create Project", onClick: () => {} }}
        />
      )}
    </div>
  );
}
