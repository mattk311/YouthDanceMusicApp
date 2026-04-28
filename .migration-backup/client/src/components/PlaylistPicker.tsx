import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Music, Check, ArrowLeft, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Playlist {
  id: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
  isPublic: boolean;
}

interface PlaylistTrack {
  id: string;
  name: string;
  artists: string;
  imageUrl: string | null;
}

interface PlaylistPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  songTitle: string;
}

export default function PlaylistPicker({ open, onOpenChange, trackId, songTitle }: PlaylistPickerProps) {
  const { toast } = useToast();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [addedAtPosition, setAddedAtPosition] = useState<number | null>(null);

  // Reset internal state whenever the dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedPlaylist(null);
      setAddedAtPosition(null);
    }
  }, [open]);

  const { data: playlistsData, isLoading: playlistsLoading, error: playlistsError } = useQuery<{ playlists: Playlist[] }>({
    queryKey: ["/api/spotify/playlists"],
    enabled: open && !selectedPlaylist,
  });

  const { data: tracksData, isLoading: tracksLoading, error: tracksError } = useQuery<{ tracks: PlaylistTrack[] }>({
    queryKey: ["/api/spotify/playlists", selectedPlaylist?.id, "tracks"],
    enabled: open && !!selectedPlaylist,
  });

  const addMutation = useMutation({
    mutationFn: async (position: number | null) => {
      if (!selectedPlaylist) throw new Error("No playlist selected");
      const body: { trackId: string; position?: number } = { trackId };
      if (position !== null) body.position = position;
      const response = await apiRequest("POST", `/api/spotify/playlists/${selectedPlaylist.id}/add`, body);
      return response.json();
    },
    onSuccess: (_data, position) => {
      setAddedAtPosition(position ?? -1);
      if (selectedPlaylist) {
        queryClient.invalidateQueries({
          queryKey: ["/api/spotify/playlists", selectedPlaylist.id, "tracks"],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/spotify/playlists"] });
      toast({
        title: "Added to playlist",
        description: `"${songTitle}" was added to "${selectedPlaylist?.name}".`,
      });
      setTimeout(() => {
        onOpenChange(false);
      }, 1200);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add to playlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const playlists = playlistsData?.playlists || [];
  const tracks = tracksData?.tracks || [];

  const renderInsertButton = (position: number | null, label: string, key: string) => {
    const isAddedHere =
      addedAtPosition !== null &&
      ((position === null && addedAtPosition === -1) || addedAtPosition === position);
    const isPendingHere = addMutation.isPending && addMutation.variables === position;

    return (
      <button
        key={key}
        type="button"
        onClick={() => addMutation.mutate(position)}
        disabled={addMutation.isPending || addedAtPosition !== null}
        className="group w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover-elevate active-elevate-2 text-left disabled:opacity-60 disabled:cursor-not-allowed"
        data-testid={`button-insert-${position === null ? "end" : position}`}
      >
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 border-t border-dashed border-border" />
          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
            {isPendingHere ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isAddedHere ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            {label}
          </span>
          <div className="flex-1 border-t border-dashed border-border" />
        </div>
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle data-testid="text-playlist-dialog-title">
            {selectedPlaylist ? "Choose position" : "Add to Playlist"}
          </DialogTitle>
          <DialogDescription>
            {selectedPlaylist
              ? `Pick where to insert "${songTitle}" in "${selectedPlaylist.name}".`
              : `Choose a playlist to add "${songTitle}"`}
          </DialogDescription>
        </DialogHeader>

        {selectedPlaylist && (
          <div className="flex items-center justify-between gap-2 -mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPlaylist(null);
                setAddedAtPosition(null);
              }}
              disabled={addMutation.isPending}
              data-testid="button-back-to-playlists"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to playlists
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {/* Playlist list view */}
          {!selectedPlaylist && (
            <>
              {playlistsLoading && (
                <div className="flex items-center justify-center py-8" data-testid="loading-playlists">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading playlists...</span>
                </div>
              )}

              {playlistsError && (
                <div className="text-center py-8 text-destructive" data-testid="error-playlists">
                  <p>Failed to load playlists. Please try again.</p>
                </div>
              )}

              {!playlistsLoading && !playlistsError && playlists.length === 0 && (
                <div className="text-center py-8 text-muted-foreground" data-testid="empty-playlists">
                  <p>No playlists found. Create a playlist in Spotify first.</p>
                </div>
              )}

              {!playlistsLoading && playlists.length > 0 && (
                <div className="space-y-1" data-testid="playlist-list">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => setSelectedPlaylist(playlist)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover-elevate active-elevate-2 text-left transition-colors"
                      data-testid={`button-playlist-${playlist.id}`}
                    >
                      {playlist.imageUrl ? (
                        <img
                          src={playlist.imageUrl}
                          alt={playlist.name}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Music className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{playlist.name}</p>
                        <p className="text-sm text-muted-foreground">{playlist.trackCount} tracks</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Track list with insertion zones */}
          {selectedPlaylist && (
            <>
              {tracksLoading && (
                <div className="flex items-center justify-center py-8" data-testid="loading-tracks">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading songs...</span>
                </div>
              )}

              {tracksError && (
                <div className="text-center py-8 text-destructive" data-testid="error-tracks">
                  <p>Failed to load playlist songs. Please try again.</p>
                </div>
              )}

              {!tracksLoading && !tracksError && (
                <div className="space-y-0.5" data-testid="track-list">
                  {tracks.length === 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground text-center py-4">
                        This playlist is empty.
                      </p>
                      {renderInsertButton(null, "Add here", "insert-empty")}
                    </>
                  ) : (
                    <>
                      {renderInsertButton(0, "Insert at top", "insert-top")}
                      {tracks.map((track, index) => (
                        <div key={`${track.id}-${index}`}>
                          <div
                            className="flex items-center gap-3 px-2 py-1.5 rounded-md"
                            data-testid={`row-track-${index}`}
                          >
                            <span className="text-xs text-muted-foreground w-6 text-right tabular-nums flex-shrink-0">
                              {index + 1}
                            </span>
                            {track.imageUrl ? (
                              <img
                                src={track.imageUrl}
                                alt={track.name}
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <Music className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" data-testid={`text-track-name-${index}`}>
                                {track.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {track.artists}
                              </p>
                            </div>
                          </div>
                          {index < tracks.length - 1 &&
                            renderInsertButton(index + 1, "Insert here", `insert-${index + 1}`)}
                        </div>
                      ))}
                      {renderInsertButton(null, "Add to end", "insert-end")}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
