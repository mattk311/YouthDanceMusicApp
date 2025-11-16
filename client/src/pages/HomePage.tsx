import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import SongSearchForm from "@/components/SongSearchForm";
import SongResult, { type SongStatus, type SongData } from "@/components/SongResult";
import ThemeToggle from "@/components/ThemeToggle";
import AdSense from "@/components/AdSense";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export default function HomePage() {
  const { toast } = useToast();
  const [searchResult, setSearchResult] = useState<{
    status: SongStatus;
    song?: SongData;
  } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

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
      if (!data.found) {
        setSearchResult({ status: "not-found" });
      } else {
        // Determine status based on AI evaluation or fallback to explicit flag
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
          // Fallback when AI evaluation is unavailable
          if (data.song.explicit) {
            status = "unsafe";
          } else {
            status = "review"; // Mark for manual review when AI is unavailable
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

      // Scroll to results after a short delay to allow render
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "start" 
        });
      }, 100);
    },
    onError: (error: Error) => {
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
      <div className="flex items-center justify-end p-4 border-b bg-card">
        <ThemeToggle />
      </div>
      
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
        </div>
      </main>
    </div>
  );
}
