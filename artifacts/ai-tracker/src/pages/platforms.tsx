import { useListPlatforms } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

export default function Platforms() {
  const { data: platforms, isLoading } = useListPlatforms();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Platforms</h1>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : platforms && platforms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platforms.map((platform) => (
            <Card key={platform.id}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                {platform.logoUrl ? (
                  <img src={platform.logoUrl} alt={platform.name} className="w-10 h-10 rounded-md object-contain bg-muted" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {platform.name.charAt(0)}
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg">{platform.name}</CardTitle>
                  {platform.category && (
                    <Badge variant="outline" className="mt-1">{platform.category}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {platform.website && (
                  <a 
                    href={platform.website} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-sm text-primary flex items-center gap-1 hover:underline mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Visit Website
                  </a>
                )}
                {platform.notes && (
                  <p className="text-sm text-muted-foreground mt-4 line-clamp-3">
                    {platform.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-lg">
          No platforms found.
        </div>
      )}
    </div>
  );
}
