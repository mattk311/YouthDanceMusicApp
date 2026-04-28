import SongResult from '../SongResult';

export default function SongResultExample() {
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <SongResult 
        status="safe"
        song={{
          title: "Happy",
          artist: "Pharrell Williams",
          album: "G I R L",
          albumArt: "https://i.scdn.co/image/ab67616d0000b273e8107e6d9214baa81bb79bba",
          explicit: false,
          spotifyUrl: "https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCH"
        }}
      />

      <SongResult 
        status="unsafe"
        song={{
          title: "Example Explicit Song",
          artist: "Example Artist",
          album: "Example Album",
          albumArt: "https://i.scdn.co/image/ab67616d0000b273e8107e6d9214baa81bb79bba",
          explicit: true,
        }}
      />

      <SongResult status="not-found" />
    </div>
  );
}
