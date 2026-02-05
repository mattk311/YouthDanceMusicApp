import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export type SongStatus = "safe" | "unsafe" | "not-found" | "review";

export interface SongEvaluation {
  appropriate: boolean;
  reasoning: string;
  concerns: string[];
  positives: string[];
  recommendation: "approved" | "not-recommended" | "review-needed";
  danceType?: "fast" | "slow";
  isLineDance?: boolean;
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
  onAddToQueue?: (trackId: string) => Promise<void>;
}

export default function SongResult({ status, song, isSubscribed, onAddToQueue }: SongResultProps) {
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);

  const handleAddToQueue = async () => {
    if (!song?.spotifyTrackId || !onAddToQueue) return;
    setIsAddingToQueue(true);
    try {
      await onAddToQueue(song.spotifyTrackId);
    } finally {
      setIsAddingToQueue(false);
    }
  };
  if (status === "not-found") {
    return (
      <Card className="border-l-4 border-l-warning">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertCircle className="h-8 w-8 text-warning flex-shrink-0" />
            <div className="space-y-2">
              <h3
                className="text-xl font-semibold"
                data-testid="text-result-title"
              >
                Song Not Found
              </h3>
              <p className="text-muted-foreground">
                We couldn't find this song. Please check the spelling and try
                again, or try adding the artist name.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!song) return null;

  const isSafe = status === "safe";
  const isReview = status === "review";
  const evaluation = song.evaluation;

  const getStatusConfig = () => {
    if (isSafe) {
      return {
        icon: CheckCircle2,
        iconColor: "text-success",
        borderColor: "border-l-success",
        title: "Approved for Church Dance",
        iconTestId: "icon-safe",
      };
    } else if (isReview) {
      return {
        icon: AlertTriangle,
        iconColor: "text-warning",
        borderColor: "border-l-warning",
        title: "Review Recommended",
        iconTestId: "icon-review",
      };
    } else {
      return {
        icon: XCircle,
        iconColor: "text-destructive",
        borderColor: "border-l-destructive",
        title: "Not Recommended",
        iconTestId: "icon-unsafe",
      };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <Card className={`border-l-4 ${statusConfig.borderColor}`}>
      <CardContent className="pt-6">
        <div className="flex gap-6">
          <div className="flex-shrink-0">
            <StatusIcon
              className={`h-8 w-8 ${statusConfig.iconColor}`}
              data-testid={statusConfig.iconTestId}
            />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h3
                className="text-2xl font-semibold mb-1"
                data-testid="text-result-title"
              >
                {statusConfig.title}
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {song.albumArt && (
                <img
                  src={song.albumArt}
                  alt={`${song.album} album art`}
                  className="w-32 h-32 rounded-lg object-cover flex-shrink-0"
                  data-testid="img-album-art"
                />
              )}

              <div className="space-y-3 flex-1">
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p
                    className="text-lg font-medium"
                    data-testid="text-song-title"
                  >
                    {song.title}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Artist</p>
                  <p className="font-medium" data-testid="text-song-artist">
                    {song.artist}
                  </p>
                </div>

                {song.album && (
                  <div>
                    <p className="text-sm text-muted-foreground">Album</p>
                    <p className="font-medium" data-testid="text-song-album">
                      {song.album}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {song.explicit && (
                    <Badge variant="destructive" data-testid="badge-explicit">
                      Explicit Content
                    </Badge>
                  )}
                  {!song.explicit && (
                    <Badge
                      variant="secondary"
                      className="bg-success/10 text-success border-success/20"
                      data-testid="badge-clean"
                    >
                      Clean
                    </Badge>
                  )}
                  {song.spotifyUrl && (
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
                  )}
                  {isSubscribed && song.spotifyTrackId && onAddToQueue && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddToQueue}
                      disabled={isAddingToQueue}
                      className="gap-2"
                      data-testid="button-add-to-queue"
                    >
                      {isAddingToQueue ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ListPlus className="h-4 w-4" />
                      )}
                      Add to Queue
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />
            {evaluation ? (
              <div className="space-y-4">
                {evaluation.danceType && (
                  <div className="flex flex-wrap gap-2" data-testid="dance-type-badges">
                    <Badge 
                      variant="outline" 
                      className="gap-1"
                      data-testid={`badge-dance-${evaluation.danceType}`}
                    >
                      <Music className="h-3 w-3" />
                      {evaluation.danceType === "fast" ? "Fast Dance" : "Slow Dance"}
                    </Badge>
                    {evaluation.danceType === "fast" && evaluation.isLineDance && (
                      <Badge 
                        variant="outline" 
                        className="gap-1 bg-primary/10 text-primary border-primary/20"
                        data-testid="badge-line-dance"
                      >
                        <Users className="h-3 w-3" />
                        Line Dance
                      </Badge>
                    )}
                  </div>
                )}
                
                <div>
                  <h4 className="font-semibold mb-2">AI Evaluation</h4>
                  <p
                    className="text-muted-foreground"
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
                        <li
                          key={index}
                          className="text-sm text-muted-foreground"
                        >
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
                        <li
                          key={index}
                          className="text-sm text-muted-foreground"
                        >
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
