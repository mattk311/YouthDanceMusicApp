import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Search,
  Music,
  Users,
  ExternalLink,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import type { Song } from "@shared/schema";

function getRecommendationConfig(recommendation: string | null, isExplicit: boolean) {
  if (recommendation === "approved") {
    return {
      icon: CheckCircle2,
      iconColor: "text-success",
      label: "Approved",
      badgeClass: "bg-success/10 text-success border-success/20",
    };
  } else if (recommendation === "not-recommended") {
    return {
      icon: XCircle,
      iconColor: "text-destructive",
      label: "Not Recommended",
      badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    };
  } else if (recommendation === "review-needed") {
    return {
      icon: AlertTriangle,
      iconColor: "text-warning",
      label: "Review Needed",
      badgeClass: "bg-warning/10 text-warning border-warning/20",
    };
  } else {
    if (isExplicit) {
      return {
        icon: XCircle,
        iconColor: "text-destructive",
        label: "Explicit",
        badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
      };
    }
    return {
      icon: AlertTriangle,
      iconColor: "text-warning",
      label: "Not Evaluated",
      badgeClass: "bg-warning/10 text-warning border-warning/20",
    };
  }
}

export default function PopularSongsPage() {
  const { data, isLoading, error } = useQuery<{ songs: Song[] }>({
    queryKey: ["/api/songs/popular"],
  });

  const isProError = error && (error as any)?.message?.includes("Pro subscription");

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between gap-3 p-4 border-b bg-card">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Button>
        </Link>
        <ThemeToggle />
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Popular Songs
            </h1>
            <p className="text-muted-foreground">
              Songs ranked by how many times they've been searched
            </p>
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="text-muted-foreground" data-testid="text-loading">Loading popular songs...</div>
            </div>
          )}

          {isProError && (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold">Pro Feature</h2>
                <p className="text-muted-foreground">
                  Popular Songs is available exclusively for Pro subscribers.
                </p>
                <Link href="/">
                  <Button data-testid="button-go-subscribe">Subscribe to Pro</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {error && !isProError && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-destructive" data-testid="text-error">Something went wrong. Please try again later.</p>
              </CardContent>
            </Card>
          )}

          {data?.songs && data.songs.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center space-y-2">
                <Music className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground" data-testid="text-empty">No songs have been searched yet.</p>
              </CardContent>
            </Card>
          )}

          {data?.songs && data.songs.length > 0 && (
            <div className="space-y-3" data-testid="popular-songs-list">
              {data.songs.map((song, index) => {
                const config = getRecommendationConfig(song.aiRecommendation, song.isExplicit || false);
                const StatusIcon = config.icon;

                return (
                  <Card key={song.id} className="hover-elevate" data-testid={`card-song-${song.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-muted-foreground w-10 text-center flex-shrink-0" data-testid={`text-rank-${index}`}>
                          {index + 1}
                        </div>

                        {song.albumArt ? (
                          <img
                            src={song.albumArt}
                            alt={`${song.albumName} album art`}
                            className="w-14 h-14 rounded-md object-cover flex-shrink-0"
                            data-testid={`img-album-art-${song.id}`}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <Music className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate" data-testid={`text-song-name-${song.id}`}>
                            {song.songName}
                          </p>
                          <p className="text-sm text-muted-foreground truncate" data-testid={`text-artist-name-${song.id}`}>
                            {song.artistName}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap justify-end">
                          {song.aiDanceType && (
                            <Badge variant="outline" className="gap-1 hidden sm:flex">
                              <Music className="h-3 w-3" />
                              {song.aiDanceType === "fast" ? "Fast" : "Slow"}
                            </Badge>
                          )}
                          {song.aiIsLineDance && (
                            <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20 hidden sm:flex">
                              <Users className="h-3 w-3" />
                              Line Dance
                            </Badge>
                          )}

                          <Badge variant="outline" className={config.badgeClass} data-testid={`badge-status-${song.id}`}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${config.iconColor}`} />
                            {config.label}
                          </Badge>

                          <Badge variant="secondary" data-testid={`badge-count-${song.id}`}>
                            <Search className="h-3 w-3 mr-1" />
                            {song.searchCount}
                          </Badge>

                          {song.spotifyUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              data-testid={`button-spotify-${song.id}`}
                            >
                              <a
                                href={song.spotifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
