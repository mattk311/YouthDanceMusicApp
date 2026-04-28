# Church Dance Music Safety Checker - Design Guidelines

## Design Approach
**System-Based Design**: Material Design 3 principles with youth-friendly adaptations. Clean, functional interface prioritizing quick song verification with clear visual feedback.

## Typography
- **Primary Font**: Inter (Google Fonts)
  - Headings: 600 weight, sizes 2xl-4xl
  - Body: 400 weight, base-lg sizes
  - Labels/Meta: 500 weight, sm-base sizes
- **Hierarchy**: Bold headings for results, medium weight for form labels, regular for descriptions

## Layout System
- **Spacing Units**: Tailwind units of 4, 6, 8, 12, 16 for consistent rhythm
- **Container**: max-w-4xl centered for main content area
- **Grid**: Single column on mobile, potential 2-column split for results on desktop (lg:grid-cols-2)

## Core Components

### Authentication
- Centered card layout (max-w-md) with church/youth-friendly welcome message
- Google sign-in button with official Google branding
- Soft rounded corners (rounded-2xl) for friendly feel

### Search Interface
- Prominent search card with generous padding (p-8)
- Two input fields: Song Title (primary) and Artist (secondary)
- Large, friendly search button with icon
- Clear label hierarchy and helper text

### Results Display
**Safe Songs (Green Treatment)**:
- Card with subtle green accent border (border-l-4)
- Checkmark icon with "Safe for Church Dance" heading
- Album art displayed prominently (w-32 h-32, rounded-lg)
- Song title (text-2xl, bold), artist, album info below

**Unsafe Songs (Red Treatment)**:
- Card with red accent border (border-l-4)
- Warning icon with "Not Recommended" heading
- Same layout structure for consistency
- Explicit content badge prominent

**Song Not Found**:
- Yellow/amber accent for neutral warning
- Info icon with clear "Song Not Found" message

### Navigation
- Simple header bar with app title and user profile/logout in top-right
- No complex navigation needed - single-page app focus

## Visual Elements
- **Cards**: Elevated with subtle shadows (shadow-lg), rounded-2xl corners
- **Icons**: Material Icons via CDN for consistency (search, check, warning, info)
- **Spacing**: Generous whitespace between elements (space-y-6 to space-y-8)
- **Buttons**: Rounded-lg with comfortable padding (px-6 py-3)

## Images
**Album Art**: Central to results display, fetched from Spotify API
- Square format (1:1 ratio)
- Displayed at 128px × 128px in results
- Rounded corners (rounded-lg) for modern feel
- No hero image needed - this is a utility app

## Layout Flow
1. **Authenticated State**: Search card prominent at top, previous searches/history below
2. **Results State**: Search stays accessible at top, results appear below with clear visual distinction
3. **Responsive**: Stack vertically on mobile, maintain clean single-column focus

## Key Principles
- **Clarity First**: Immediate understanding of safe/unsafe status
- **Youth-Appropriate**: Friendly but not childish - professional with warmth
- **Fast Interaction**: Minimal clicks from search to result
- **Trustworthy**: Clean, organized interface builds confidence in recommendations