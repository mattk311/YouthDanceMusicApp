import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SongSearchFormProps {
  onSearch?: (songTitle: string, artist: string) => void;
  isLoading?: boolean;
}

export default function SongSearchForm({ onSearch, isLoading }: SongSearchFormProps) {
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (songTitle.trim()) {
      onSearch?.(songTitle, artist);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Search for a Song</CardTitle>
        <CardDescription>
          Enter the song title and artist to check if it's appropriate for your event
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="song-title">Song Title *</Label>
            <Input
              id="song-title"
              placeholder="Enter song title..."
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              disabled={isLoading}
              data-testid="input-song-title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="artist">Artist (Optional)</Label>
            <Input
              id="artist"
              placeholder="Enter artist name..."
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              disabled={isLoading}
              data-testid="input-artist"
            />
            <p className="text-sm text-muted-foreground">
              Adding the artist helps find the correct song
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full gap-2 h-11"
            disabled={!songTitle.trim() || isLoading}
            data-testid="button-search"
          >
            <Search className="h-5 w-5" />
            {isLoading ? "Searching..." : "Check Song"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
