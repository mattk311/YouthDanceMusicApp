# Google AdSense Setup Guide

Your application is now ready for Google AdSense integration! Follow these steps to start generating revenue.

## Step 1: Apply for Google AdSense

1. **Visit Google AdSense**: https://www.google.com/adsense
2. **Sign up** with your Google account
3. **Provide your website information**:
   - Website URL: Your Replit app URL (e.g., `https://your-app.replit.app`)
   - Content language: English
   - Website category: Religious/Spiritual

4. **Wait for approval** (typically 1-2 weeks)
   - Google will review your site
   - You need quality content and traffic
   - The site must comply with AdSense policies

## Step 2: Get Your Publisher ID

Once approved:

1. Log in to your AdSense account
2. Go to **Account → Account Information**
3. Copy your **Publisher ID** (format: `ca-pub-XXXXXXXXXXXXXXXX`)

## Step 3: Create Ad Units

1. In AdSense dashboard, go to **Ads → Overview**
2. Click **"By ad unit"** → **"Display ads"**
3. Create **3 ad units**:

   **Banner Ad (Top)**
   - Name: `Church Music Checker - Top Banner`
   - Ad size: Responsive
   - Copy the Ad Unit ID (format: `1234567890`)

   **Rectangle Ad (Content)**
   - Name: `Church Music Checker - Content`
   - Ad size: Responsive or 300x250
   - Copy the Ad Unit ID

   **Footer Banner**
   - Name: `Church Music Checker - Footer`
   - Ad size: Responsive
   - Copy the Ad Unit ID

## Step 4: Add to Your Replit Secrets

1. In Replit, open **Tools → Secrets** (lock icon 🔒)
2. Add these environment variables:

   ```
   VITE_ADSENSE_CLIENT = ca-pub-XXXXXXXXXXXXXXXX
   VITE_ADSENSE_SLOT_BANNER = 1234567890
   VITE_ADSENSE_SLOT_RECTANGLE = 9876543210
   VITE_ADSENSE_SLOT_FOOTER = 5555555555
   ```

3. Replace with your actual IDs from Step 2 and Step 3

## Step 5: Update AdSense Script

1. Open `client/index.html`
2. Find the AdSense script line:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js" crossorigin="anonymous"></script>
   ```
3. Update it to include your publisher ID:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
   ```

## Step 6: Add ads.txt File

1. Get your `ads.txt` content from AdSense:
   - Go to **Account → Sites → Manage sites**
   - Click **"View ads.txt snippet"**
   - Copy the content

2. Create a file at `client/public/ads.txt` with that content:
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```

## Step 7: Test Your Ads

1. **Restart your application** after adding the secrets
2. **Disable ad blockers** in your browser
3. **Open your app** - you should see ad spaces
4. **Note**: Ads may take a few hours to appear, even after setup

## Ad Placement Strategy

Your app now has ads in **3 strategic locations**:

1. **Top Banner** (above search form)
   - High visibility
   - First thing users see
   - Best for brand awareness

2. **In-Content Rectangle** (after search results)
   - Appears after user gets results
   - High engagement area
   - Only shows when results are displayed

3. **Footer Banner** (bottom of page)
   - Always visible
   - Users see it while scrolling

## Revenue Optimization Tips

1. **Quality Content**: Keep adding valuable features
2. **User Engagement**: The more searches, the more ad impressions
3. **Mobile Optimization**: Ensure ads display well on mobile (already responsive)
4. **Traffic**: Drive more users to your app
5. **Compliance**: Never click your own ads

## AdSense Policies to Follow

- ✅ Don't click your own ads
- ✅ Don't encourage clicks ("Click here", "Support us")
- ✅ Don't place misleading content near ads
- ✅ Maintain good user experience (we've optimized placement for this)
- ✅ Ensure content is appropriate (your app is faith-based, which is good!)

## Monitoring Performance

1. Check your **AdSense dashboard** regularly
2. Track metrics:
   - Page views
   - Ad impressions
   - Click-through rate (CTR)
   - Estimated earnings

3. Optimize based on data:
   - Which ad positions perform best
   - Peak usage times
   - User engagement patterns

## Troubleshooting

**Ads not showing?**
- Wait 24-48 hours after setup
- Check that environment variables are set correctly
- Disable ad blockers
- Verify your site is approved in AdSense
- Check browser console for errors

**Low earnings?**
- Increase traffic to your site
- Improve user engagement
- Ensure mobile responsiveness
- Check ad viewability

**Policy violations?**
- Review AdSense policies
- Remove any prohibited content
- Check ad placement guidelines
- Contact AdSense support

## Next Steps

Once ads are running:
1. Monitor performance weekly
2. Experiment with ad formats (if revenue is low)
3. Drive more traffic through SEO and marketing
4. Consider additional features to increase engagement
5. Maintain content quality for continued approval

---

**Need Help?**
- AdSense Help Center: https://support.google.com/adsense
- AdSense Policies: https://support.google.com/adsense/answer/48182
- Contact AdSense Support through your dashboard

Your app is now monetization-ready! 🎉
