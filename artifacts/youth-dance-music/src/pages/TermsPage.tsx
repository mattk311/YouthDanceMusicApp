import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <h1 className="text-3xl font-bold mb-6">Terms of Use</h1>
            <p className="text-muted-foreground mb-6">
              Last updated: September 18, 2026
            </p>
            <h2>Subscriptions</h2>
            <p>
              Youth Dance Music Pro is an auto-renewing monthly subscription.
              Payment is charged to your Apple ID when you confirm the purchase.
              The subscription renews automatically unless canceled at least 24
              hours before the end of the current billing period.
            </p>
            <p>
              You can manage or cancel your subscription in your Apple account
              subscription settings. Cancellation stops future renewals; Pro
              access remains available until the end of the paid period.
            </p>
            <h2>Service</h2>
            <p>
              Song evaluations are informational and do not replace the judgment
              of event organizers, parents, or guardians. You are responsible for
              deciding whether music is appropriate for your event.
            </p>
            <h2>Acceptable use</h2>
            <p>
              Do not misuse the service, attempt to disrupt it, or use it in a
              way that violates applicable law or the rights of others.
            </p>
            <h2>Contact</h2>
            <p>
              Questions about these terms may be sent to
              support@youthdancemusic.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}