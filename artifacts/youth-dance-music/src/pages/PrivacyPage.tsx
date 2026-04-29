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
              Last updated: April 29, 2026
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
              <p className="text-muted-foreground mb-4">
                When you use Youth Dance Music (whether on the web or in the mobile app), we collect the following information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Google account information (name, email, profile picture) when you sign in</li>
                <li>Song search queries and song requests you submit</li>
                <li>Dances you create as a host (name, date, settings)</li>
                <li>Usage data (which features you use, when, and how often) to improve our service</li>
                <li>Basic device information (operating system, app version) for diagnostics</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Mobile App</h2>
              <p className="text-muted-foreground mb-4">
                Our Android and iOS apps store the following on your device:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>A secure sign-in token (kept in the device's encrypted keystore) so you stay signed in between sessions</li>
                <li>Camera access, only when you choose to scan a dance QR code &mdash; we do not record, save, or transmit camera images</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Signing out of the app deletes the sign-in token from your device and revokes it on our servers.
              </p>
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
              <h2 className="text-xl font-semibold mb-3">Children&rsquo;s Privacy</h2>
              <p className="text-muted-foreground">
                Youth Dance Music is intended for use by adults &mdash; primarily DJs, event hosts, and parents
                organizing dances for younger audiences. The app is not directed at children under 13, and we do
                not knowingly collect personal information from children under 13. If you believe a child has
                provided us with personal information, please contact us at{" "}
                <a
                  href="mailto:privacy@youthdancemusic.com"
                  className="text-primary underline"
                >
                  privacy@youthdancemusic.com
                </a>{" "}
                and we will delete it.
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
              <h2 className="text-xl font-semibold mb-3">Account &amp; Data Deletion</h2>
              <p className="text-muted-foreground mb-4">
                To delete your account and all associated personal data (Google profile, song requests,
                dances you&rsquo;ve created, and saved sign-in tokens), email us at{" "}
                <a
                  href="mailto:privacy@youthdancemusic.com"
                  className="text-primary underline"
                >
                  privacy@youthdancemusic.com
                </a>{" "}
                from the email address linked to your Google account. We will confirm and complete the
                deletion within 30 days.
              </p>
              <p className="text-muted-foreground">
                You can also revoke Youth Dance Music&rsquo;s access to your Google account at any time
                from your{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Google account permissions page
                </a>
                .
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy or our data practices, please email{" "}
                <a
                  href="mailto:privacy@youthdancemusic.com"
                  className="text-primary underline"
                >
                  privacy@youthdancemusic.com
                </a>
                .
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
