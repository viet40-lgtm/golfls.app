# G-GolfLS Project Walkthrough

This document provides a technical walkthrough of the G-GolfLS application's core architecture and recent design improvements.

## 1. Core Architecture

### Tech Stack
- **Framework**: Next.js 15+ (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS 4.0
- **Animations**: Framer Motion
- **Persistence**: LocalStorage for optimistic UI, Supabase/PostgreSQL for source of truth.

### Key Directories
- `/app`: Contains the main application routes.
- `/app/live`: The "Live Scoring" engine (the heart of the app).
- `/components`: Reusable UI elements (Modals, Forms, Cards).
- `/scripts`: Database migration and handicap calculation utilities.
- `/lib`: Helper functions for math, date formatting, and scorecard generation.

---

## 2. Recent Design Improvements

### Premium Leaderboard (LiveLeaderboardCard.tsx)
The leaderboard has been redesigned for maximum legibility on-course:
- **High-Contrast Cards**: White/80 glassmorphism cards with a subtle green gradient header.
- **Dynamic Scoring Grid**:
    - **Par**: Simple number (removed "Par" label to save space).
    - **Birdies**: Highlighted in green.
    - **Eagles/Better**: Highlighted in yellow.
    - **Bogeys**: Highlighted in orange.
    - **Doubles/Worse**: Highlighted in red.
- **Legibility Tweak**: Gross (GRS) and Handicap (HCP) numbers are set to solid black (`text-zinc-900`) for maximum contrast, while Net scores retain their colored indicators.
- **Header ID**: The active Round ID is displayed as a green badge directly next to the Menu button for quick reference, with the "ID:" prefix removed for a cleaner look.

### Scorekeeper Safety
- **Takeover Confirmation**: If a player attempts to keep score for someone already managed by another device, a confirmation popup ("Confirm Scorekeeper Change") appears to prevent accidental overrides.
- **Auto-Lock**: When a player is "claimed" by another scorekeeper, their local scoring interface is automatically disabled to prevent conflicts.

### Streamlined Login Flow
- Removed redundant routes to ensure a single, fast entry point at the root path (`/`).
- Fixed high-contrast input fields to prevent "white-on-white" visibility issues common in mobile sunlight.

---

## 3. Data Flow: The Scoring Engine
1. **Input**: User taps a score on the hole grid.
2. **Optimistic UI**: The score is immediately updated in the local `scores` Map state.
3. **Local Sync**: The score is backed up to `localStorage` immediately to prevent data loss on page refresh.
4. **Server Sync**: `saveLiveScore` action is called. The UI waits for confirmation before allowing navigation to the next hole (Race Condition Fix).
5. **Real-time**: Other devices in the same round see the updates on the next poll/refresh.

---

## 4. Mobile Strategy (TWA)
The app is built to feel like a native Android app:
- **No Scroll Overlays**: Custom modals that don't shift the background layout.
- **Touch Targets**: All buttons and score inputs are sized for thumbs (min 44px).
- **Offline Ready**: Service worker caches core UI assets.
