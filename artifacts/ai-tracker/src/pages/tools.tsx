import { useListTools } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Pin } from "lucide-react";

export default function Tools() {
  const { data: tools, isLoading } = useListTools();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Tools & Websites</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : tools && tools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Card key={tool.id} className={tool.isPinned ? "border-primary/50" : ""}>
              <CardHeader className="pb-3 flex flex-row justify-between items-start space-y-0">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {tool.name}
                    {tool.isPinned && <Pin className="w-3 h-3 text-primary" />}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2">
                    {tool.projectName && <span>{tool.projectName}</span>}
                    {tool.platformName && (
                      <>
                        <span>•</span>
                        <span>{tool.platformName}</span>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {tool.category && (
                  <Badge variant="secondary" className="mb-3">{tool.category}</Badge>
                )}
                {tool.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {tool.description}
                  </p>
                )}
                <a 
                  href={tool.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-sm text-primary flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {tool.url.replace(/^https?:\/\//, '').split('/')[0]}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-lg">
          No tools found.
        </div>
      )}
    </div>
  );
}
