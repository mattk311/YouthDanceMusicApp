import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
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
            <h1 className="text-3xl font-bold mb-6" data-testid="text-privacy-title">
              Privacy Policy
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
              <p className="text-muted-foreground mb-4">
                When you use Youth Dance Music, we collect the following information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Google account information (name, email, profile picture) when you sign in</li>
                <li>Song search queries you submit</li>
                <li>Usage data to improve our service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">
                We use the collected information to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide and maintain our song verification service</li>
                <li>Authenticate your access to the application</li>
                <li>Cache search results to improve performance</li>
                <li>Improve and personalize your experience</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Third-Party Services</h2>
              <p className="text-muted-foreground mb-4">
                Our service integrates with the following third-party services:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Google OAuth</strong> - For secure authentication</li>
                <li><strong>Spotify</strong> - To search for song information</li>
                <li><strong>OpenAI</strong> - To analyze song content for appropriateness</li>
                <li><strong>Google AdSense</strong> - To display relevant advertisements</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Each of these services has their own privacy policies that govern how they handle your data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Data Storage and Security</h2>
              <p className="text-muted-foreground">
                We store your data securely using industry-standard encryption and security practices. 
                Your search history and cached results are stored in a secure database to improve 
                performance and reduce API calls. We do not sell or share your personal information 
                with third parties for marketing purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Cookies</h2>
              <p className="text-muted-foreground">
                We use cookies to maintain your login session and remember your preferences. 
                Third-party services like Google AdSense may also use cookies to display 
                relevant advertisements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
              <p className="text-muted-foreground mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Access the personal information we hold about you</li>
                <li>Request deletion of your account and associated data</li>
                <li>Opt out of non-essential cookies</li>
                <li>Withdraw consent for data processing at any time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy or our data practices, 
                please contact us through the application.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any 
                changes by posting the new Privacy Policy on this page and updating the 
                "Last updated" date.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
