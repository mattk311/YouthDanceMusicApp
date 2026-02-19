import { useState, useRef, useEffect } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import SongSearchForm from "@/components/SongSearchForm";
import SongResult, { type SongStatus, type SongData } from "@/components/SongResult";
import ThemeToggle from "@/components/ThemeToggle";
import AdSense from "@/components/AdSense";
import UsageBadge from "@/components/UsageBadge";
import SubscriptionCard from "@/components/SubscriptionCard";
import NotificationBell from "@/components/NotificationBell";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, Disc } from "lucide-react";
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
        description: "You can subscribe anytime to get unlimited searches.",
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
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Logout failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const searchMutation = useMutation({
    mutationFn: async ({ title, artist }: { title: string; artist: string }) => {
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
          if (data.song.explicit) {
            status = "unsafe";
          } else {
            status = "review";
          }
        }

        setSearchResult({
          status,
          song: {
            ...data.song,
            evaluation: data.evaluation,
          },
        });
      }

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "start" 
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

  const handleSearch = (songTitle: string, artist: string) => {
    searchMutation.mutate({ title: songTitle, artist });
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-end gap-3 p-4 border-b bg-card flex-wrap">
        {usage?.isSubscribed && (
          <Link href="/popular">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="link-popular-songs">
              <TrendingUp className="h-4 w-4" />
              Popular Songs
            </Button>
          </Link>
        )}
        {usage?.isSubscribed && (
          <Link href="/dances">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="link-dance-management">
              <Disc className="h-4 w-4" />
              Dance Management
            </Button>
          </Link>
        )}
        {usage?.isSubscribed && <NotificationBell />}
        {usage && (
          <UsageBadge 
            remaining={usage.remaining} 
            isSubscribed={usage.isSubscribed}
            onClick={() => setShowSubscription(true)}
          />
        )}
        <ThemeToggle />
      </div>

      <Dialog open={showSubscription} onOpenChange={setShowSubscription}>
        <DialogContent className="sm:max-w-md p-0 border-0 bg-transparent shadow-none">
          <SubscriptionCard 
            isSubscribed={usage?.isSubscribed || false} 
            onClose={() => setShowSubscription(false)}
          />
        </DialogContent>
      </Dialog>
      
      <Header 
        user={user ? {
          name: user.name,
          email: user.email,
          avatar: user.avatar || undefined,
        } : undefined}
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Top Banner Ad */}
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
                onConnectSpotify={() => window.location.href = "/auth/spotify"}
              />
              
              {/* In-Content Ad (after results) */}
              <div className="mt-8 flex justify-center" data-testid="ad-content">
                <AdSense
                  slot={import.meta.env.VITE_ADSENSE_SLOT_RECTANGLE}
                  format="auto"
                  style={{ display: "block", minHeight: "250px" }}
                  className="max-w-full"
                />
              </div>
            </div>
          )}

          {/* Footer Ad */}
          <div className="mt-12 flex justify-center" data-testid="ad-footer">
            <AdSense
              slot={import.meta.env.VITE_ADSENSE_SLOT_FOOTER}
              format="auto"
              style={{ display: "block", minHeight: "90px" }}
              className="max-w-full"
            />
          </div>

          {/* Footer */}
          <footer className="mt-8 pt-6 border-t text-center">
            <Link 
              href="/privacy" 
              className="text-sm text-muted-foreground hover:underline"
              data-testid="link-footer-privacy"
            >
              Privacy Policy
            </Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
