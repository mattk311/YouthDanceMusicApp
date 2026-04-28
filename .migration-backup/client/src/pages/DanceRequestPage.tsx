import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Send,
  ArrowLeft,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Clock,
  LogIn,
  Music,
  Lock,
} from "lucide-react";

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

  const { data: user, isLoading: userLoading } = useQuery<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null>({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        toast({
          title: "Dance not found",
          description: err.error || "Check the code and try again.",
          variant: "destructive",
        });
        setDance(null);
        return;
      }
      const data = await res.json();
      setDance(data);
    } catch {
      toast({
        title: "Error",
        description: "Could not look up dance. Please try again.",
        variant: "destructive",
      });
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
      if (!res.ok) throw new Error("Search failed");
      const data: SearchResult = await res.json();
      setSearchResult(data);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch {
      toast({
        title: "Search failed",
        description: "Could not search for the song. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!dance || !searchResult?.song || !isLoggedIn) return;

    if (searchResult.song.explicit) {
      toast({
        title: "Cannot request this song",
        description:
          "This song is marked as explicit and cannot be requested.",
        variant: "destructive",
      });
      return;
    }

    if (searchResult.evaluation?.recommendation === "not-recommended") {
      toast({
        title: "Cannot request this song",
        description: "This song has not been approved for church dances.",
        variant: "destructive",
      });
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
      setRequestUsage((prev) =>
        prev
          ? { ...prev, count: prev.count + 1, remaining: data.remaining }
          : null,
      );
      toast({
        title: "Request sent!",
        description: "Your song request has been sent to the DJ.",
      });
    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
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

  const isCleanSong =
    searchResult?.found &&
    searchResult.song &&
    !searchResult.song.explicit &&
    searchResult.evaluation?.recommendation !== "not-recommended";
  const hasReachedLimit = requestUsage && requestUsage.remaining <= 0;

  // Step indicator helper
  type Step = 1 | 2 | 3;
  const currentStep: Step = !dance ? 1 : !submitted ? 2 : 3;

  const StepDot = ({
    n,
    label,
    active,
    done,
  }: {
    n: number;
    label: string;
    active: boolean;
    done: boolean;
  }) => (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
          done
            ? "bg-success text-success-foreground"
            : active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
        }`}
        data-testid={`step-dot-${n}`}
      >
        {done ? <Check className="h-4 w-4" /> : n}
      </div>
      <span
        className={`text-xs sm:text-sm ${
          active || done ? "text-foreground font-medium" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );

  if (userLoading) {
    return (
      <AppShell>
        <main className="container mx-auto px-3 sm:px-4 py-8">
          <div className="max-w-xl mx-auto space-y-4">
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell user={user || undefined} onSignIn={handleLogin}>
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-xl mx-auto space-y-5 sm:space-y-6">
          {/* Step indicator */}
          <div
            className="flex items-center justify-between gap-2 px-1"
            data-testid="step-indicator"
          >
            <StepDot
              n={1}
              label="Find dance"
              active={currentStep === 1}
              done={currentStep > 1}
            />
            <div className="h-px flex-1 bg-border" />
            <StepDot
              n={2}
              label="Pick song"
              active={currentStep === 2}
              done={currentStep > 2}
            />
            <div className="h-px flex-1 bg-border" />
            <StepDot
              n={3}
              label="Sent"
              active={currentStep === 3}
              done={false}
            />
          </div>

          {!dance ? (
            <Card>
              <CardHeader>
                <CardTitle
                  className="text-xl sm:text-2xl"
                  data-testid="text-enter-code-title"
                >
                  Request a Song
                </CardTitle>
                <CardDescription>
                  Enter the dance code or scan the QR code to request a song.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCodeSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dance-code">Dance Code</Label>
                    <Input
                      id="dance-code"
                      placeholder="ABC123"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="font-mono text-center text-xl tracking-[0.4em] uppercase"
                      required
                      data-testid="input-dance-code"
                      autoComplete="off"
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
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <CardTitle
                        className="text-lg sm:text-xl"
                        data-testid="text-dance-name"
                      >
                        {dance.name}
                      </CardTitle>
                      <CardDescription className="space-y-1 mt-2 text-xs sm:text-sm">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {dance.date}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {dance.startTime} - {dance.endTime}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {dance.location}
                        </span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDance(null);
                        setCode("");
                        resetForNewRequest();
                        setRequestUsage(null);
                      }}
                      data-testid="button-change-dance"
                      className="gap-1"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Change
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {!isLoggedIn ? (
                <div data-testid="text-login-required">
                  <EmptyState
                    icon={LogIn}
                    title="Sign in to Request Songs"
                    description="You need to sign in with Google to request songs for this dance."
                    variant="default"
                    testId="empty-login-required"
                    action={
                      <Button
                        onClick={handleLogin}
                        className="gap-2"
                        data-testid="button-login-to-request"
                      >
                        <LogIn className="h-4 w-4" />
                        Sign in with Google
                      </Button>
                    }
                  />
                </div>
              ) : !dance.isActive ? (
                <EmptyState
                  icon={Lock}
                  title="Dance closed"
                  description="This dance is no longer accepting requests."
                  variant="muted"
                  testId="empty-dance-closed"
                />
              ) : hasReachedLimit && !submitted ? (
                <div data-testid="text-limit-reached">
                  <EmptyState
                    icon={Lock}
                    title="Request Limit Reached"
                    description={`You have used all ${requestUsage.limit} of your song requests for this dance.`}
                    variant="warning"
                    testId="empty-limit-reached"
                  />
                </div>
              ) : submitted ? (
                <Card data-testid="card-success">
                  <CardContent className="py-8 text-center space-y-4">
                    <div className="flex justify-center">
                      <div
                        className="h-16 w-16 rounded-full bg-success/15 text-success flex items-center justify-center animate-in zoom-in-50 duration-500"
                        data-testid="icon-request-success"
                      >
                        <Check className="h-8 w-8" strokeWidth={3} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p
                        className="text-lg font-semibold"
                        data-testid="text-request-success"
                      >
                        Request Sent!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        The DJ will see your song request.
                      </p>
                      {requestUsage && requestUsage.remaining > 0 && (
                        <p
                          className="text-sm text-muted-foreground"
                          data-testid="text-remaining-requests"
                        >
                          You have {requestUsage.remaining} request
                          {requestUsage.remaining !== 1 ? "s" : ""} remaining
                          for this dance.
                        </p>
                      )}
                      {requestUsage && requestUsage.remaining <= 0 && (
                        <p
                          className="text-sm text-muted-foreground"
                          data-testid="text-no-remaining"
                        >
                          You have used all your requests for this dance.
                        </p>
                      )}
                    </div>
                    {requestUsage && requestUsage.remaining > 0 && (
                      <Button
                        onClick={resetForNewRequest}
                        variant="outline"
                        data-testid="button-request-another"
                      >
                        Request Another Song
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-5">
                  {requestUsage && (
                    <div className="text-center">
                      <Badge
                        variant="outline"
                        className="gap-1"
                        data-testid="text-request-count"
                      >
                        {requestUsage.remaining} of {requestUsage.limit} requests
                        remaining
                      </Badge>
                    </div>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">
                        Search for a Song
                      </CardTitle>
                      <CardDescription>
                        Find the song you want to request.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form
                        onSubmit={handleSongSearch}
                        className="space-y-4"
                      >
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
                          disabled={
                            searchLoading ||
                            !songTitle.trim() ||
                            !artist.trim()
                          }
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
                        <div data-testid="text-not-found">
                          <EmptyState
                            icon={Music}
                            title="Song not found"
                            description="Try a different search term or check your spelling."
                            testId="empty-not-found"
                          />
                        </div>
                      ) : (
                        searchResult.song && (
                          <Card
                            className="overflow-hidden"
                            data-testid="card-search-result"
                          >
                            {/* Status banner */}
                            {(() => {
                              const explicit = searchResult.song?.explicit;
                              const rec =
                                searchResult.evaluation?.recommendation;
                              const banner = explicit
                                ? {
                                    bg: "bg-destructive/10 border-destructive/30",
                                    iconWrap:
                                      "bg-destructive/20 text-destructive",
                                    Icon: XCircle,
                                    title: "Explicit — cannot request",
                                  }
                                : rec === "not-recommended"
                                  ? {
                                      bg: "bg-destructive/10 border-destructive/30",
                                      iconWrap:
                                        "bg-destructive/20 text-destructive",
                                      Icon: XCircle,
                                      title: "Not approved for church dances",
                                    }
                                  : rec === "review-needed"
                                    ? {
                                        bg: "bg-warning/10 border-warning/30",
                                        iconWrap:
                                          "bg-warning/20 text-warning",
                                        Icon: AlertTriangle,
                                        title: "Needs review",
                                      }
                                    : {
                                        bg: "bg-success/10 border-success/30",
                                        iconWrap:
                                          "bg-success/20 text-success",
                                        Icon: CheckCircle2,
                                        title: "Looks good — request away",
                                      };
                              const Icon = banner.Icon;
                              return (
                                <div
                                  className={`px-4 py-3 border-b flex items-center gap-3 ${banner.bg}`}
                                  data-testid="banner-result-status"
                                >
                                  <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0 ${banner.iconWrap}`}
                                  >
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <p className="text-sm font-semibold">
                                    {banner.title}
                                  </p>
                                </div>
                              );
                            })()}

                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 sm:gap-4">
                                {searchResult.song.albumArt ? (
                                  <img
                                    src={searchResult.song.albumArt}
                                    alt=""
                                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-md object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                    <Music className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p
                                    className="font-semibold truncate"
                                    data-testid="text-result-song"
                                  >
                                    {searchResult.song.title}
                                  </p>
                                  <p
                                    className="text-sm text-muted-foreground truncate"
                                    data-testid="text-result-artist"
                                  >
                                    {searchResult.song.artist}
                                  </p>
                                  {searchResult.song.album && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {searchResult.song.album}
                                    </p>
                                  )}
                                  <div className="flex gap-1.5 mt-2 flex-wrap">
                                    {searchResult.evaluation?.danceType && (
                                      <Badge variant="outline">
                                        {searchResult.evaluation.danceType ===
                                        "fast"
                                          ? "Fast"
                                          : "Slow"}
                                      </Badge>
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
                                  {submitLoading
                                    ? "Sending..."
                                    : "Request This Song"}
                                </Button>
                              ) : (
                                <p
                                  className="mt-4 text-xs text-center text-muted-foreground"
                                  data-testid="text-song-not-allowed"
                                >
                                  {searchResult.song.explicit
                                    ? "This song is explicit and cannot be requested."
                                    : "This song has not been approved for church dances."}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
