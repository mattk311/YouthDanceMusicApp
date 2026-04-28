import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Music,
  Users,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Flame,
  AlertCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import { SongRowSkeletonList } from "@/components/skeletons";
import type { Song, User } from "@shared/schema";

const PAGE_SIZE = 20;

interface UsageData {
  count: number;
  remaining: number;
  isSubscribed: boolean;
}

function getRecommendationConfig(
  recommendation: string | null,
  isExplicit: boolean,
) {
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
      label: "Review",
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
  const [currentPage, setCurrentPage] = useState(1);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: usage } = useQuery<UsageData>({
    queryKey: ["/api/usage"],
    enabled: !!user,
  });

  const { data, isLoading, error } = useQuery<{ songs: Song[] }>({
    queryKey: ["/api/songs/popular"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const isProError =
    error && (error as any)?.message?.includes("Pro subscription");

  const allSongs = [...(data?.songs ?? [])].sort((a, b) => {
    const aScore = a.aiDanceability ?? -1;
    const bScore = b.aiDanceability ?? -1;
    if (bScore !== aScore) return bScore - aScore;
    const countDiff = (b.searchCount || 0) - (a.searchCount || 0);
    if (countDiff !== 0) return countDiff;
    return a.id.localeCompare(b.id);
  });
  const totalPages = Math.max(1, Math.ceil(allSongs.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageSongs = allSongs.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <AppShell
      user={
        user
          ? {
              name: user.name,
              email: user.email,
              avatar: user.avatar || undefined,
            }
          : undefined
      }
      usage={usage}
      onLogout={() => logoutMutation.mutate()}
    >
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
          <div className="space-y-2">
            <Link href="/" data-testid="button-back-home">
              <Button variant="ghost" size="sm" className="gap-2 -ml-2">
                <ChevronLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              data-testid="text-page-title"
            >
              Popular Songs
            </h1>
            <p className="text-sm text-muted-foreground">
              Top songs ranked by danceability and search popularity.
            </p>
          </div>

          {isLoading && (
            <div data-testid="text-loading">
              <span className="sr-only">Loading popular songs...</span>
              <SongRowSkeletonList count={8} />
            </div>
          )}

          {isProError && (
            <EmptyState
              icon={Search}
              title="Pro Feature"
              description="Popular Songs is available exclusively for Pro subscribers."
              variant="default"
              testId="empty-pro-required"
              action={
                <Link href="/">
                  <Button data-testid="button-go-subscribe">
                    Subscribe to Pro
                  </Button>
                </Link>
              }
            />
          )}

          {error && !isProError && (
            <div data-testid="text-error">
              <EmptyState
                icon={AlertCircle}
                title="Something went wrong"
                description="We couldn't load popular songs. Please try again later."
                variant="destructive"
                testId="empty-error"
              />
            </div>
          )}

          {data?.songs && allSongs.length === 0 && (
            <div data-testid="text-empty">
              <EmptyState
                icon={Music}
                title="No songs yet"
                description="Songs will appear here as people search for them."
                testId="empty-songs"
              />
            </div>
          )}

          {allSongs.length > 0 && (
            <div className="space-y-2 sm:space-y-3" data-testid="popular-songs-list">
              {pageSongs.map((song, index) => {
                const globalIndex = pageStart + index;
                const config = getRecommendationConfig(
                  song.aiRecommendation,
                  song.isExplicit || false,
                );
                const StatusIcon = config.icon;

                return (
                  <Card
                    key={song.id}
                    className="hover-elevate"
                    data-testid={`card-song-${song.id}`}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div
                          className="text-base sm:text-xl font-bold text-muted-foreground w-6 sm:w-9 text-center flex-shrink-0 tabular-nums"
                          data-testid={`text-rank-${globalIndex}`}
                        >
                          {globalIndex + 1}
                        </div>

                        {song.albumArt ? (
                          <img
                            src={song.albumArt}
                            alt={`${song.albumName} album art`}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-md object-cover flex-shrink-0"
                            data-testid={`img-album-art-${song.id}`}
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <Music className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p
                            className="font-semibold truncate text-sm sm:text-base"
                            data-testid={`text-song-name-${song.id}`}
                          >
                            {song.songName}
                          </p>
                          <p
                            className="text-xs sm:text-sm text-muted-foreground truncate"
                            data-testid={`text-artist-name-${song.id}`}
                          >
                            {song.artistName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`${config.badgeClass} gap-1`}
                              data-testid={`badge-status-${song.id}`}
                            >
                              <StatusIcon
                                className={`h-3 w-3 ${config.iconColor}`}
                              />
                              {config.label}
                            </Badge>
                            {typeof song.aiDanceability === "number" && (
                              <Badge
                                variant="outline"
                                className="gap-1"
                                title="Danceability (1-10)"
                                data-testid={`badge-danceability-${song.id}`}
                              >
                                <Flame className="h-3 w-3" />
                                {song.aiDanceability}/10
                              </Badge>
                            )}
                            {song.aiDanceType && (
                              <Badge
                                variant="outline"
                                className="gap-1 hidden xs:inline-flex sm:inline-flex"
                              >
                                <Music className="h-3 w-3" />
                                {song.aiDanceType === "fast" ? "Fast" : "Slow"}
                              </Badge>
                            )}
                            {song.aiIsLineDance && (
                              <Badge
                                variant="outline"
                                className="gap-1 bg-primary/10 text-primary border-primary/20 hidden sm:inline-flex"
                              >
                                <Users className="h-3 w-3" />
                                Line
                              </Badge>
                            )}
                            <Badge
                              variant="secondary"
                              className="gap-1"
                              data-testid={`badge-count-${song.id}`}
                            >
                              <Search className="h-3 w-3" />
                              {song.searchCount}
                            </Badge>
                          </div>
                        </div>

                        {song.spotifyUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            data-testid={`button-spotify-${song.id}`}
                            className="flex-shrink-0"
                          >
                            <a
                              href={song.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${song.songName} in Spotify`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {totalPages > 1 && (
                <div
                  className="flex items-center justify-between gap-2 pt-3"
                  data-testid="pagination-controls"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={currentPage === 1}
                    className="gap-1"
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <span
                    className="text-sm text-muted-foreground"
                    data-testid="text-page-indicator"
                  >
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={currentPage === totalPages}
                    className="gap-1"
                    data-testid="button-next-page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
