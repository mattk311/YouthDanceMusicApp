import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/ThemeToggle";
import { Music, Search, Send, ArrowLeft, Check, MapPin, Calendar, Clock, LogIn } from "lucide-react";

interface DanceInfo {
  id: string;
  code: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  isActive: boolean;
}

interface SearchResult {
  found: boolean;
  song?: {
    title: string;
    artist: string;
    album?: string;
    albumArt?: string;
    explicit?: boolean;
    spotifyUrl?: string;
  };
  evaluation?: {
    recommendation: string;
    danceType?: string;
  } | null;
}

interface RequestUsage {
  count: number;
  remaining: number;
  limit: number;
}

export default function DanceRequestPage() {
  const { toast } = useToast();
  const search = useSearch();
  const [code, setCode] = useState("");
  const [dance, setDance] = useState<DanceInfo | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [requestUsage, setRequestUsage] = useState<RequestUsage | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  const { data: user, isLoading: userLoading } = useQuery<{ id: string; name: string; email: string; avatar?: string } | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const isLoggedIn = !!user;

  useEffect(() => {
    const params = new URLSearchParams(search);
    const codeParam = params.get("code");
    if (codeParam) {
      setCode(codeParam.toUpperCase());
      lookupDance(codeParam.toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (dance && isLoggedIn) {
      fetchRequestUsage(dance.code);
    }
  }, [dance, isLoggedIn]);

  const fetchRequestUsage = async (danceCode: string) => {
    try {
      const res = await fetch(`/api/dances/${danceCode}/my-requests`);
      if (res.ok) {
        const data = await res.json();
        setRequestUsage(data);
      }
    } catch {
      // silently fail
    }
  };

  const lookupDance = async (danceCode: string) => {
    if (!danceCode.trim()) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/dances/code/${danceCode.toUpperCase()}`);
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Dance not found", description: err.error || "Check the code and try again.", variant: "destructive" });
        setDance(null);
        return;
      }
      const data = await res.json();
      setDance(data);
    } catch {
      toast({ title: "Error", description: "Could not look up dance. Please try again.", variant: "destructive" });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupDance(code);
  };

  const handleSongSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim() || !artist.trim()) return;
    setSearchLoading(true);
    setSearchResult(null);
    try {
      const params = new URLSearchParams({ title: songTitle, artist });
      const res = await fetch(`/api/songs/search-public?${params}`);
      if (!res.ok) {
        throw new Error("Search failed");
      }
      const data: SearchResult = await res.json();
      setSearchResult(data);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      toast({ title: "Search failed", description: "Could not search for the song. Please try again.", variant: "destructive" });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!dance || !searchResult?.song || !isLoggedIn) return;

    if (searchResult.song.explicit) {
      toast({ title: "Cannot request this song", description: "This song is marked as explicit and cannot be requested.", variant: "destructive" });
      return;
    }

    if (searchResult.evaluation?.recommendation === "not-recommended") {
      toast({ title: "Cannot request this song", description: "This song has not been approved for church dances.", variant: "destructive" });
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/dances/${dance.code}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songTitle: searchResult.song.title,
          artistName: searchResult.song.artist,
          albumArt: searchResult.song.albumArt || null,
          spotifyUrl: searchResult.song.spotifyUrl || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit request");
      }

      const data = await res.json();
      setSubmitted(true);
      setRequestUsage(prev => prev ? { ...prev, count: prev.count + 1, remaining: data.remaining } : null);
      toast({ title: "Request sent!", description: "Your song request has been sent to the DJ." });
    } catch (error: any) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForNewRequest = () => {
    setSongTitle("");
    setArtist("");
    setSearchResult(null);
    setSubmitted(false);
  };

  const handleLogin = () => {
    const currentUrl = window.location.pathname + window.location.search;
    window.location.href = `/auth/google?returnTo=${encodeURIComponent(currentUrl)}`;
  };

  const isCleanSong = searchResult?.found && searchResult.song && !searchResult.song.explicit && searchResult.evaluation?.recommendation !== "not-recommended";
  const hasReachedLimit = requestUsage && requestUsage.remaining <= 0;

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between gap-3 p-4 border-b bg-card flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Music className="h-4 w-4" />
          </div>
          <span className="font-semibold" data-testid="text-app-name">Youth Dance Music</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoggedIn && (
            <span className="text-sm text-muted-foreground" data-testid="text-user-name">{user.name}</span>
          )}
          <ThemeToggle />
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto space-y-6">
          {!dance ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl" data-testid="text-enter-code-title">Request a Song</CardTitle>
                <CardDescription>Enter the dance code or scan the QR code to request a song</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCodeSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dance-code">Dance Code</Label>
                    <Input
                      id="dance-code"
                      placeholder="Enter 6-character code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="font-mono text-center text-lg tracking-widest"
                      required
                      data-testid="input-dance-code"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={lookupLoading || code.length < 3}
                    data-testid="button-lookup-dance"
                  >
                    {lookupLoading ? "Looking up..." : "Find Dance"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle data-testid="text-dance-name">{dance.name}</CardTitle>
                      <CardDescription className="space-y-1 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {dance.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {dance.startTime} - {dance.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {dance.location}
                        </span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setDance(null); setCode(""); resetForNewRequest(); setRequestUsage(null); }}
                      data-testid="button-change-dance"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Change
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {!isLoggedIn ? (
                <Card>
                  <CardContent className="py-8 text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <LogIn className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-semibold" data-testid="text-login-required">Sign in to Request Songs</p>
                      <p className="text-muted-foreground mt-1">You need to sign in with Google to request songs for this dance.</p>
                    </div>
                    <Button onClick={handleLogin} className="gap-2" data-testid="button-login-to-request">
                      <LogIn className="h-4 w-4" />
                      Sign in with Google
                    </Button>
                  </CardContent>
                </Card>
              ) : !dance.isActive ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">This dance is no longer accepting requests.</p>
                  </CardContent>
                </Card>
              ) : hasReachedLimit && !submitted ? (
                <Card>
                  <CardContent className="py-8 text-center space-y-2">
                    <p className="text-lg font-semibold" data-testid="text-limit-reached">Request Limit Reached</p>
                    <p className="text-muted-foreground">
                      You have used all {requestUsage.limit} of your song requests for this dance.
                    </p>
                  </CardContent>
                </Card>
              ) : submitted ? (
                <Card>
                  <CardContent className="py-8 text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-semibold" data-testid="text-request-success">Request Sent!</p>
                      <p className="text-muted-foreground mt-1">The DJ will see your song request.</p>
                      {requestUsage && requestUsage.remaining > 0 && (
                        <p className="text-sm text-muted-foreground mt-2" data-testid="text-remaining-requests">
                          You have {requestUsage.remaining} request{requestUsage.remaining !== 1 ? "s" : ""} remaining for this dance.
                        </p>
                      )}
                      {requestUsage && requestUsage.remaining <= 0 && (
                        <p className="text-sm text-muted-foreground mt-2" data-testid="text-no-remaining">
                          You have used all your requests for this dance.
                        </p>
                      )}
                    </div>
                    {requestUsage && requestUsage.remaining > 0 && (
                      <Button onClick={resetForNewRequest} variant="outline" data-testid="button-request-another">
                        Request Another Song
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {requestUsage && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground" data-testid="text-request-count">
                        {requestUsage.remaining} of {requestUsage.limit} requests remaining
                      </p>
                    </div>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Search for a Song</CardTitle>
                      <CardDescription>Find the song you want to request</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSongSearch} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="req-song-title">Song Title</Label>
                          <Input
                            id="req-song-title"
                            placeholder="Enter song title..."
                            value={songTitle}
                            onChange={(e) => setSongTitle(e.target.value)}
                            required
                            data-testid="input-request-song-title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="req-artist">Artist</Label>
                          <Input
                            id="req-artist"
                            placeholder="Enter artist name..."
                            value={artist}
                            onChange={(e) => setArtist(e.target.value)}
                            required
                            data-testid="input-request-artist"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full gap-2"
                          disabled={searchLoading || !songTitle.trim() || !artist.trim()}
                          data-testid="button-search-song"
                        >
                          <Search className="h-4 w-4" />
                          {searchLoading ? "Searching..." : "Search"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {searchResult && (
                    <div ref={resultsRef}>
                      {!searchResult.found ? (
                        <Card>
                          <CardContent className="py-6 text-center">
                            <p className="text-muted-foreground" data-testid="text-not-found">Song not found. Try a different search.</p>
                          </CardContent>
                        </Card>
                      ) : searchResult.song && (
                        <Card>
                          <CardContent className="py-4">
                            <div className="flex items-center gap-4">
                              {searchResult.song.albumArt && (
                                <img src={searchResult.song.albumArt} alt="" className="h-16 w-16 rounded-md object-cover flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate" data-testid="text-result-song">{searchResult.song.title}</p>
                                <p className="text-sm text-muted-foreground truncate" data-testid="text-result-artist">{searchResult.song.artist}</p>
                                {searchResult.song.album && (
                                  <p className="text-xs text-muted-foreground truncate">{searchResult.song.album}</p>
                                )}
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {searchResult.song.explicit && (
                                    <Badge variant="destructive">Explicit</Badge>
                                  )}
                                  {searchResult.evaluation?.recommendation === "approved" && (
                                    <Badge className="bg-green-600 text-white no-default-hover-elevate">Approved</Badge>
                                  )}
                                  {searchResult.evaluation?.recommendation === "not-recommended" && (
                                    <Badge variant="destructive">Not Recommended</Badge>
                                  )}
                                  {searchResult.evaluation?.recommendation === "review-needed" && (
                                    <Badge className="bg-yellow-500 text-white no-default-hover-elevate">Review Needed</Badge>
                                  )}
                                  {searchResult.evaluation?.danceType && (
                                    <Badge variant="outline">{searchResult.evaluation.danceType}</Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {isCleanSong ? (
                              <Button
                                className="w-full mt-4 gap-2"
                                onClick={handleSubmitRequest}
                                disabled={submitLoading}
                                data-testid="button-submit-request"
                              >
                                <Send className="h-4 w-4" />
                                {submitLoading ? "Sending..." : "Request This Song"}
                              </Button>
                            ) : (
                              <div className="mt-4 p-3 rounded-md bg-destructive/10 text-sm text-center">
                                <p data-testid="text-song-not-allowed">
                                  {searchResult.song.explicit
                                    ? "This song is explicit and cannot be requested."
                                    : "This song has not been approved for church dances."}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
