import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SongResult, { type SongData } from "../SongResult";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const baseSong: SongData = {
  title: "Test Song",
  artist: "Test Artist",
  album: "Test Album",
  albumArt: "https://example.com/art.png",
  explicit: false,
  spotifyUrl: "https://open.spotify.com/track/abc",
  spotifyTrackId: "abc",
};

describe("SongResult selectors", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the not-found banner with preserved testids", () => {
    renderWithClient(<SongResult status="not-found" />);

    expect(screen.getByTestId("card-result")).toBeInTheDocument();
    expect(screen.getByTestId("banner-status")).toBeInTheDocument();
    expect(screen.getByTestId("text-result-title")).toBeInTheDocument();
  });

  it("renders an approved result with song meta + Spotify link + Connect Spotify CTA when not connected", () => {
    renderWithClient(
      <SongResult
        status="safe"
        song={{
          ...baseSong,
          evaluation: {
            appropriate: true,
            reasoning: "Lyrics are clean and uplifting.",
            concerns: [],
            positives: ["Positive message"],
            recommendation: "approved",
            danceType: "fast",
            isLineDance: false,
            danceability: 8,
          },
        }}
        spotifyConnected={false}
        onConnectSpotify={() => {}}
      />,
    );

    expect(screen.getByTestId("card-result")).toBeInTheDocument();
    expect(screen.getByTestId("banner-status")).toBeInTheDocument();
    expect(screen.getByTestId("text-song-title")).toHaveTextContent("Test Song");
    expect(screen.getByTestId("text-song-artist")).toHaveTextContent(
      "Test Artist",
    );
    expect(screen.getByTestId("text-song-album")).toHaveTextContent(
      "Test Album",
    );
    expect(screen.getByTestId("img-album-art")).toBeInTheDocument();
    expect(screen.getByTestId("badge-clean")).toBeInTheDocument();
    expect(screen.getByTestId("badge-dance-fast")).toBeInTheDocument();
    expect(screen.getByTestId("badge-danceability")).toHaveTextContent("8/10");
    expect(screen.getByTestId("button-spotify-link")).toBeInTheDocument();
    expect(screen.getByTestId("button-connect-spotify")).toBeInTheDocument();
    expect(screen.getByTestId("text-evaluation-reasoning")).toHaveTextContent(
      "uplifting",
    );
    expect(screen.getByTestId("list-positives")).toBeInTheDocument();
  });

  it("shows the Add to Playlist button when Spotify is connected", () => {
    renderWithClient(
      <SongResult
        status="safe"
        song={{
          ...baseSong,
          evaluation: {
            appropriate: true,
            reasoning: "Clean and uplifting.",
            concerns: [],
            positives: [],
            recommendation: "approved",
          },
        }}
        spotifyConnected={true}
      />,
    );

    expect(screen.getByTestId("button-add-to-playlist")).toBeInTheDocument();
  });

  it("renders the unsafe state with the disabled spotify link and the concerns list", () => {
    renderWithClient(
      <SongResult
        status="unsafe"
        song={{
          ...baseSong,
          explicit: true,
          evaluation: {
            appropriate: false,
            reasoning: "Contains explicit lyrics.",
            concerns: ["Profanity", "Drug references"],
            positives: [],
            recommendation: "not-recommended",
          },
        }}
        spotifyConnected={true}
      />,
    );

    expect(screen.getByTestId("card-result")).toBeInTheDocument();
    expect(screen.getByTestId("badge-explicit")).toBeInTheDocument();
    const spotifyBtn = screen.getByTestId("button-spotify-link");
    expect(spotifyBtn).toBeDisabled();
    expect(screen.getByTestId("list-concerns")).toBeInTheDocument();
  });
});
