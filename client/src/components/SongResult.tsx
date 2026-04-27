import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Music,
  Users,
  ListPlus,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import PlaylistPicker from "./PlaylistPicker";

export type SongStatus = "safe" | "unsafe" | "not-found" | "review";

export interface SongEvaluation {
  appropriate: boolean;
  reasoning: string;
  concerns: string[];
  positives: string[];
  recommendation: "approved" | "not-recommended" | "review-needed";
  danceType?: "fast" | "slow";
  isLineDance?: boolean;
  danceability?: number | null;
}

export interface SongData {
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  explicit: boolean;
  spotifyUrl?: string;
  spotifyTrackId?: string;
  evaluation?: SongEvaluation;
}

interface SongResultProps {
  status: SongStatus;
  song?: SongData;
  isSubscribed?: boolean;
  spotifyConnected?: boolean;
  onConnectSpotify?: () => void;
}

interface BannerStyles {
  banner: string;
  iconWrap: string;
  testid: string;
  title: string;
  subtitle?: string;
  Icon: typeof CheckCircle2;
}

export default function SongResult({
  status,
  song,
  spotifyConnected,
  onConnectSpotify,
}: SongResultProps) {
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);

  if (status === "not-found") {
    return (
      <Card className="overflow-hidden" data-testid="card-result">
        <div
          className="bg-warning/10 border-b border-warning/30 px-4 py-4 flex items-center gap-3"
          data-testid="banner-status"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20 text-warning flex-shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3
              className="text-base sm:text-lg font-semibold leading-tight"
              data-testid="text-result-title"
            >
              Song Not Found
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Try checking the spelling or adding the artist name.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!song) return null;

  const isSafe = status === "safe";
  const isReview = status === "review";
  const isUnsafe = status === "unsafe";
  const evaluation = song.evaluation;

  const bannerStyles: BannerStyles = isSafe
    ? {
        banner: "bg-success/10 border-success/30",
        iconWrap: "bg-success/20 text-success",
        testid: "icon-safe",
        title: "Approved for Church Dance",
        subtitle: "This song is safe to play.",
        Icon: CheckCircle2,
      }
    : isReview
      ? {
          banner: "bg-warning/10 border-warning/30",
          iconWrap: "bg-warning/20 text-warning",
          testid: "icon-review",
          title: "Review Recommended",
          subtitle: "Please review the details before playing.",
          Icon: AlertTriangle,
        }
      : {
          banner: "bg-destructive/10 border-destructive/30",
          iconWrap: "bg-destructive/20 text-destructive",
          testid: "icon-unsafe",
          title: "Not Recommended",
          subtitle: "This song is not appropriate for a church dance.",
          Icon: XCircle,
        };

  const { Icon: StatusIcon } = bannerStyles;

  return (
    <Card className="overflow-hidden" data-testid="card-result">
      <div
        className={`px-4 py-4 border-b flex items-center gap-3 ${bannerStyles.banner}`}
        data-testid="banner-status"
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 ${bannerStyles.iconWrap}`}
        >
          <StatusIcon className="h-5 w-5" data-testid={bannerStyles.testid} />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className="text-base sm:text-lg font-semibold leading-tight"
            data-testid="text-result-title"
          >
            {bannerStyles.title}
          </h3>
          {bannerStyles.subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              {bannerStyles.subtitle}
            </p>
          )}
        </div>
      </div>

      <CardContent className="pt-5 space-y-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {song.albumArt && (
            <img
              src={song.albumArt}
              alt={`${song.album} album art`}
              className="w-full sm:w-32 h-48 sm:h-32 rounded-md object-cover flex-shrink-0"
              data-testid="img-album-art"
            />
          )}

          <div className="space-y-3 flex-1 min-w-0">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Title
              </p>
              <p
                className="text-lg font-semibold leading-tight"
                data-testid="text-song-title"
              >
                {song.title}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Artist
              </p>
              <p className="font-medium" data-testid="text-song-artist">
                {song.artist}
              </p>
            </div>

            {song.album && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Album
                </p>
                <p className="font-medium" data-testid="text-song-album">
                  {song.album}
                </p>
              </div>
            )}

            <div className="flex gap-2 flex-wrap" data-testid="dance-type-badges">
              {song.explicit ? (
                <Badge variant="destructive" data-testid="badge-explicit">
                  Explicit
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-success/10 text-success border-success/20"
                  data-testid="badge-clean"
                >
                  Clean
                </Badge>
              )}
              {evaluation?.danceType && (
                <Badge
                  variant="outline"
                  className="gap-1"
                  data-testid={`badge-dance-${evaluation.danceType}`}
                >
                  <Music className="h-3 w-3" />
                  {evaluation.danceType === "fast" ? "Fast" : "Slow"}
                </Badge>
              )}
              {evaluation?.danceType === "fast" && evaluation.isLineDance && (
                <Badge
                  variant="outline"
                  className="gap-1 bg-primary/10 text-primary border-primary/20"
                  data-testid="badge-line-dance"
                >
                  <Users className="h-3 w-3" />
                  Line Dance
                </Badge>
              )}
              {typeof evaluation?.danceability === "number" && (
                <Badge
                  variant="outline"
                  className="gap-1"
                  title="How well this song works on a youth dance floor (1-10)"
                  data-testid="badge-danceability"
                >
                  <Flame className="h-3 w-3" />
                  {evaluation.danceability}/10
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {song.spotifyUrl &&
            (isUnsafe ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="gap-2"
                title="Not recommended for church dances"
                data-testid="button-spotify-link"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Spotify
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                asChild
                data-testid="button-spotify-link"
              >
                <a
                  href={song.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Spotify
                </a>
              </Button>
            ))}
          {song.spotifyTrackId &&
            (spotifyConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlaylistPickerOpen(true)}
                disabled={isUnsafe}
                title={
                  isUnsafe ? "Not recommended for church dances" : undefined
                }
                className="gap-2"
                data-testid="button-add-to-playlist"
              >
                <ListPlus className="h-4 w-4" />
                Add to Playlist
              </Button>
            ) : onConnectSpotify ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onConnectSpotify}
                disabled={isUnsafe}
                title={
                  isUnsafe ? "Not recommended for church dances" : undefined
                }
                className="gap-2"
                data-testid="button-connect-spotify"
              >
                <ListPlus className="h-4 w-4" />
                Connect Spotify
              </Button>
            ) : null)}
        </div>

        <Separator />

        {evaluation ? (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">AI Evaluation</h4>
              <p
                className="text-sm text-muted-foreground"
                data-testid="text-evaluation-reasoning"
              >
                {evaluation.reasoning}
              </p>
            </div>

            {evaluation.positives.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold mb-2 text-success">
                  Positive Aspects
                </h5>
                <ul
                  className="list-disc list-inside space-y-1"
                  data-testid="list-positives"
                >
                  {evaluation.positives.map((positive, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {positive}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.concerns.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold mb-2 text-destructive">
                  Concerns
                </h5>
                <ul
                  className="list-disc list-inside space-y-1"
                  data-testid="list-concerns"
                >
                  {evaluation.concerns.map((concern, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div
            className="text-sm text-muted-foreground"
            data-testid="text-evaluation-unavailable"
          >
            <p className="italic">
              AI evaluation temporarily unavailable. Please review the song
              manually based on the information above.
            </p>
          </div>
        )}
      </CardContent>

      {song?.spotifyTrackId && (
        <PlaylistPicker
          open={playlistPickerOpen}
          onOpenChange={setPlaylistPickerOpen}
          trackId={song.spotifyTrackId}
          songTitle={song.title}
        />
      )}
    </Card>
  );
}
