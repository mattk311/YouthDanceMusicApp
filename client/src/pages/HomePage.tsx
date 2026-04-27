import { useState, useRef, useEffect } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import AppShell from "@/components/AppShell";
import SongSearchForm from "@/components/SongSearchForm";
import SongResult, {
  type SongStatus,
  type SongData,
} from "@/components/SongResult";
import AdSense from "@/components/AdSense";
import SubscriptionCard from "@/components/SubscriptionCard";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ShieldCheck, Sparkles, Music2 } from "lucide-react";
import type { User } from "@shared/schema";

interface UsageData {
  count: number;
  remaining: number;
  isSubscribed: boolean;
}

export default function HomePage() {
  const { toast } = useToast();
  const search = useSearch();
  const [searchResult, setSearchResult] = useState<{
    status: SongStatus;
    song?: SongData;
  } | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: usage, refetch: refetchUsage } = useQuery<UsageData>({
    queryKey: ["/api/usage"],
    enabled: !!user,
  });

  const { data: spotifyStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/spotify/status"],
    enabled: !!user,
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("subscription") === "success") {
      toast({
        title: "Subscription activated!",
        description: "You now have unlimited song searches.",
      });
      refetchUsage();
      window.history.replaceState({}, "", "/");
    } else if (params.get("subscription") === "cancelled") {
      toast({
        title: "Subscription cancelled",
        description:
          "You can subscribe anytime to get unlimited searches.",
      });
      window.history.replaceState({}, "", "/");
    }

    if (params.get("spotify_connected") === "true") {
      toast({
        title: "Spotify connected",
        description: "You can now add songs to your playlists.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/spotify/status"] });
      window.history.replaceState({}, "", "/");
    } else if (params.get("spotify_error")) {
      toast({
        title: "Spotify connection failed",
        description: "Could not connect to Spotify. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/");
    }
  }, [search, toast, refetchUsage]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const searchMutation = useMutation({
    mutationFn: async ({
      title,
      artist,
    }: {
      title: string;
      artist: string;
    }) => {
      const params = new URLSearchParams({ title });
      if (artist) params.append("artist", artist);

      const response = await fetch(`/api/songs/search?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to search song");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.usage) {
        refetchUsage();
      }

      if (!data.found) {
        setSearchResult({ status: "not-found" });
      } else {
        let status: SongStatus = "safe";
        if (data.evaluation) {
          if (data.evaluation.recommendation === "approved") {
            status = "safe";
          } else if (data.evaluation.recommendation === "not-recommended") {
            status = "unsafe";
          } else {
            status = "review";
          }
        } else {
          status = data.song.explicit ? "unsafe" : "review";
        }

        setSearchResult({
          status,
          song: { ...data.song, evaluation: data.evaluation },
        });
      }

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    },
    onError: (error: Error) => {
      if (error.message.includes("Daily search limit")) {
        setShowSubscription(true);
      }
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = (songTitle: string, artist: string) =>
    searchMutation.mutate({ title: songTitle, artist });

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
      onShowSubscription={() => setShowSubscription(true)}
      onLogout={() => logoutMutation.mutate()}
    >
      <Dialog open={showSubscription} onOpenChange={setShowSubscription}>
        <DialogContent className="sm:max-w-md p-0 border-0 bg-transparent shadow-none">
          <SubscriptionCard
            isSubscribed={usage?.isSubscribed || false}
            onClose={() => setShowSubscription(false)}
          />
        </DialogContent>
      </Dialog>

      <section className="bg-gradient-to-b from-primary/10 via-primary/5 to-transparent">
        <div className="container mx-auto px-4 pt-8 pb-6 sm:pt-12 sm:pb-10">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <h1
              className="text-2xl sm:text-4xl font-bold tracking-tight"
              data-testid="text-hero-title"
            >
              Find safe songs for your youth dance.
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              AI-checked lyrics and energy ratings so you can build a setlist
              the leaders trust and the kids love.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/70 border px-3 py-1 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                Lyric-checked
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/70 border px-3 py-1 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI evaluated
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/70 border px-3 py-1 text-xs">
                <Music2 className="h-3.5 w-3.5 text-warning" />
                Spotify backed
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
          <div className="flex justify-center" data-testid="ad-top-banner">
            <AdSense
              slot={import.meta.env.VITE_ADSENSE_SLOT_BANNER}
              format="auto"
              style={{ display: "block", minHeight: "90px" }}
              className="max-w-full"
            />
          </div>

          <SongSearchForm
            onSearch={handleSearch}
            isLoading={searchMutation.isPending}
          />

          {searchResult && (
            <div
              ref={resultsRef}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              data-testid="search-results"
            >
              <SongResult
                status={searchResult.status}
                song={searchResult.song}
                isSubscribed={usage?.isSubscribed}
                spotifyConnected={spotifyStatus?.connected}
                onConnectSpotify={() =>
                  (window.location.href = "/auth/spotify")
                }
              />

              <div
                className="mt-6 sm:mt-8 flex justify-center"
                data-testid="ad-content"
              >
                <AdSense
                  slot={import.meta.env.VITE_ADSENSE_SLOT_RECTANGLE}
                  format="auto"
                  style={{ display: "block", minHeight: "250px" }}
                  className="max-w-full"
                />
              </div>
            </div>
          )}

          <div
            className="mt-8 flex justify-center"
            data-testid="ad-footer"
          >
            <AdSense
              slot={import.meta.env.VITE_ADSENSE_SLOT_FOOTER}
              format="auto"
              style={{ display: "block", minHeight: "90px" }}
              className="max-w-full"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
