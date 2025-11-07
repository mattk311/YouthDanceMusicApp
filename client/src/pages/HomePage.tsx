import { useState } from "react";
import Header from "@/components/Header";
import SongSearchForm from "@/components/SongSearchForm";
import SongResult, { type SongStatus, type SongData } from "@/components/SongResult";
import ThemeToggle from "@/components/ThemeToggle";

export default function HomePage() {
  const [searchResult, setSearchResult] = useState<{
    status: SongStatus;
    song?: SongData;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (songTitle: string, artist: string) => {
    console.log('Searching for:', songTitle, artist);
    setIsSearching(true);
    
    setTimeout(() => {
      const mockSong: SongData = {
        title: songTitle,
        artist: artist || "Unknown Artist",
        album: "Sample Album",
        albumArt: "https://i.scdn.co/image/ab67616d0000b273e8107e6d9214baa81bb79bba",
        explicit: Math.random() > 0.7,
      };

      const foundSong = Math.random() > 0.2;
      
      if (foundSong) {
        setSearchResult({
          status: mockSong.explicit ? "unsafe" : "safe",
          song: mockSong,
        });
      } else {
        setSearchResult({
          status: "not-found",
        });
      }
      
      setIsSearching(false);
    }, 1000);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-end p-4 border-b bg-card">
        <ThemeToggle />
      </div>
      
      <Header 
        user={{
          name: "Sarah Johnson",
          email: "sarah@church.org",
        }}
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <SongSearchForm 
            onSearch={handleSearch}
            isLoading={isSearching}
          />
          
          {searchResult && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SongResult 
                status={searchResult.status}
                song={searchResult.song}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
