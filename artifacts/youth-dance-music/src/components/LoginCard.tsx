import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, ShieldCheck, Sparkles, Music2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function LoginCard() {
  const handleGoogleLogin = () => {
    window.location.href = "/auth/google";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Music className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl sm:text-3xl">
              Youth Dance Music
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Sign in to verify songs for your church youth dance.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success flex-shrink-0" />
              Lyric-checked, church-appropriate evaluations
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
              AI danceability and tempo ratings
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <Music2 className="h-4 w-4 text-warning flex-shrink-0" />
              Add approved songs to Spotify playlists
            </li>
          </ul>

          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full gap-2"
            size="lg"
            data-testid="button-google-login"
          >
            <SiGoogle className="h-5 w-5" />
            Continue with Google
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By signing in you agree to our{" "}
            <Link
              href="/privacy"
              className="underline hover:text-foreground"
              data-testid="link-privacy"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
