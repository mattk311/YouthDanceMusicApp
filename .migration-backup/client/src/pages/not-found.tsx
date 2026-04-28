import { Link } from "wouter";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <EmptyState
          icon={AlertCircle}
          title="404 — Page Not Found"
          description="The page you're looking for doesn't exist or was moved."
          variant="destructive"
          testId="empty-not-found-page"
          action={
            <Link href="/" data-testid="link-home">
              <Button>Go Home</Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}
