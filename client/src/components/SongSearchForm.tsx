import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import AutocompleteInput, { type AutocompleteInputRef } from "./AutocompleteInput";

interface SongSearchFormProps {
  onSearch?: (songTitle: string, artist: string) => void;
  isLoading?: boolean;
}

export default function SongSearchForm({ onSearch, isLoading }: SongSearchFormProps) {
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const songTitleRef = useRef<AutocompleteInputRef>(null);
  const artistRef = useRef<AutocompleteInputRef>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (songTitle.trim() && artist.trim()) {
      songTitleRef.current?.closeSuggestions();
      artistRef.current?.closeSuggestions();
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
            <AutocompleteInput
              ref={songTitleRef}
              id="song-title"
              placeholder="Enter song title..."
              value={songTitle}
              onChange={setSongTitle}
              onSelect={(suggestion) => {
                setSongTitle(suggestion.name);
                if (suggestion.artist) {
                  setArtist(suggestion.artist);
                }
              }}
              disabled={isLoading}
              type="track"
              data-testid="input-song-title"
            />
            <p className="text-sm text-muted-foreground">
              Start typing and wait 3 seconds for suggestions
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="artist">Artist *</Label>
            <AutocompleteInput
              ref={artistRef}
              id="artist"
              placeholder="Enter artist name..."
              value={artist}
              onChange={setArtist}
              onSelect={(suggestion) => setArtist(suggestion.name)}
              disabled={isLoading}
              type="artist"
              data-testid="input-artist"
            />
            <p className="text-sm text-muted-foreground">
              Artist name is required to find the correct song
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full gap-2 h-11"
            disabled={!songTitle.trim() || !artist.trim() || isLoading}
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
