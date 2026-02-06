import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Music, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Playlist {
  id: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
  isPublic: boolean;
}

interface PlaylistPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  songTitle: string;
}

export default function PlaylistPicker({ open, onOpenChange, trackId, songTitle }: PlaylistPickerProps) {
  const { toast } = useToast();
  const [addedPlaylistId, setAddedPlaylistId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ playlists: Playlist[] }>({
    queryKey: ["/api/spotify/playlists"],
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async (playlistId: string) => {
      const response = await apiRequest("POST", `/api/spotify/playlists/${playlistId}/add`, { trackId });
      return response.json();
    },
    onSuccess: (_data, playlistId) => {
      setAddedPlaylistId(playlistId);
      toast({
        title: "Added to playlist",
        description: `"${songTitle}" has been added to your playlist.`,
      });
      setTimeout(() => {
        onOpenChange(false);
        setAddedPlaylistId(null);
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add to playlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const playlists = data?.playlists || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle data-testid="text-playlist-dialog-title">Add to Playlist</DialogTitle>
          <DialogDescription>
            Choose a playlist to add "{songTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading && (
            <div className="flex items-center justify-center py-8" data-testid="loading-playlists">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading playlists...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive" data-testid="error-playlists">
              <p>Failed to load playlists. Please try again.</p>
            </div>
          )}

          {!isLoading && !error && playlists.length === 0 && (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-playlists">
              <p>No playlists found. Create a playlist in Spotify first.</p>
            </div>
          )}

          {!isLoading && playlists.length > 0 && (
            <div className="space-y-1" data-testid="playlist-list">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => addMutation.mutate(playlist.id)}
                  disabled={addMutation.isPending}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover-elevate active-elevate-2 text-left transition-colors disabled:opacity-50"
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
                  {addedPlaylistId === playlist.id ? (
                    <Check className="h-5 w-5 text-success flex-shrink-0" />
                  ) : addMutation.isPending && addMutation.variables === playlist.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground flex-shrink-0" />
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
