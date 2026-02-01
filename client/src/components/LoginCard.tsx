import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function LoginCard() {
  const handleGoogleLogin = () => {
    window.location.href = "/auth/google";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Music className="h-9 w-9" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl">Welcome</CardTitle>
            <CardDescription className="text-base">
              Sign in to verify songs for your church youth dance
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full gap-2 h-11"
            data-testid="button-google-login"
          >
            <SiGoogle className="h-5 w-5" />
            Continue with Google
          </Button>
          <p className="text-center text-sm text-muted-foreground px-4">
            Register / Login Google authentication to verify song content
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
