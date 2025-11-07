import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export type SongStatus = "safe" | "unsafe" | "not-found";

export interface SongData {
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  explicit: boolean;
  spotifyUrl?: string;
}

interface SongResultProps {
  status: SongStatus;
  song?: SongData;
}

export default function SongResult({ status, song }: SongResultProps) {
  if (status === "not-found") {
    return (
      <Card className="border-l-4 border-l-warning">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertCircle className="h-8 w-8 text-warning flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold" data-testid="text-result-title">Song Not Found</h3>
              <p className="text-muted-foreground">
                We couldn't find this song on Spotify. Please check the spelling and try again, or try adding the artist name.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!song) return null;

  const isSafe = status === "safe";

  return (
    <Card className={`border-l-4 ${isSafe ? 'border-l-success' : 'border-l-destructive'}`}>
      <CardContent className="pt-6">
        <div className="flex gap-6">
          <div className="flex-shrink-0">
            {isSafe ? (
              <CheckCircle2 className="h-8 w-8 text-success" data-testid="icon-safe" />
            ) : (
              <XCircle className="h-8 w-8 text-destructive" data-testid="icon-unsafe" />
            )}
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-2xl font-semibold mb-1" data-testid="text-result-title">
                {isSafe ? "Safe for Church Dance" : "Not Recommended"}
              </h3>
              <p className="text-muted-foreground">
                {isSafe 
                  ? "This song has been verified and is appropriate for youth events" 
                  : "This song contains explicit content and is not recommended for church youth dances"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {song.albumArt && (
                <img 
                  src={song.albumArt} 
                  alt={`${song.album} album art`}
                  className="w-32 h-32 rounded-lg object-cover"
                  data-testid="img-album-art"
                />
              )}
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="text-lg font-medium" data-testid="text-song-title">{song.title}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Artist</p>
                  <p className="font-medium" data-testid="text-song-artist">{song.artist}</p>
                </div>
                
                {song.album && (
                  <div>
                    <p className="text-sm text-muted-foreground">Album</p>
                    <p className="font-medium" data-testid="text-song-album">{song.album}</p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {song.explicit && (
                    <Badge variant="destructive" data-testid="badge-explicit">
                      Explicit Content
                    </Badge>
                  )}
                  {!song.explicit && (
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20" data-testid="badge-clean">
                      Clean
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
