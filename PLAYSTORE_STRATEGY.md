# Google Play Store Strategy: Trusted Web Activity (TWA)

This document outlines the strategy for deploying the `g-golfls-app` to the Google Play Store using the Trusted Web Activity (TWA) standard.

## Why TWA?
*   **Instant Updates**: Code pushed to the web server updates the app instantly on user devices. No waiting for App Store reviews for every hotfix.
*   **Single Codebase**: Maintain one high-quality Next.js application that serves both web and Android users.
*   **Native Experience**: Full-screen immersive mode, offline capabilities (via Service Worker), and home screen installation.

## Implementation Roadmap

### Phase 1: Build the Premium PWA (Current Phase)
1.  **[DONE] Mobile-First Design**: Ensure all UI elements are touch-friendly (min 44px tap targets) and disable pinch-to-zoom for a native app feel.
2.  **[DONE] Manifest File**: Configure `manifest.json` with:
    *   `name`: "G-GolfLS"
    *   `start_url`: "/"
    *   `display`: "standalone" (removes browser URL bar)
    *   `theme_color`: "#0f1f0d" (matches branding)
    *   `icons`: High-res icons (maskable) for Android launcher.
3.  **[DONE] Service Worker**: Implement a service worker to cache essential assets (fonts, CSS, logos) for offline performance/faster loading.

### Phase 2: Validation
1.  **[DONE] Lighthouse Audit**: Run Google Chrome's Lighthouse tool to verify "PWA" criteria are met (installability, offline support, HTTPS).
2.  **[DONE] Asset Generation**: Create specific asset sizes required by the Play Store (512x512 icon, 1024x500 feature graphic, screenshots).

### Phase 2.5: Infrastructure Setup
1.  **[DONE] Vercel Link**: Linked local project to `golfls.app` Vercel project (ID: `prj_rXqoZJbNNvXncI6g8z28wxvBhoSb`).
2.  **[DONE] Environment Config**: Synced production environment variables and updated `NEXT_PUBLIC_SITE_URL` to `https://golfls.app`.

### Phase 3: The "Wrap" (Bubblewrap)
1.  **Install Bubblewrap**: `npm install -g @bubblewrap/cli`
2.  **Initialize Project**: Run `bubblewrap init --manifest https://golfls.app/manifest.json`.
3.  **Keystores**: Create a signing key for the Android app (keep this safe!).
4.  **Build**: Run `bubblewrap build` to generate the `.aab` (Android App Bundle) file.
5.  **Digital Asset Links**: Verify domain ownership by uploading a specific JSON file (`assetlinks.json`) to the `.well-known` web directory.

### Phase 4: Publish
1.  **Google Play Console**: Create a new app listing.
2.  **Upload Bundle**: Upload the generated `.aab` file.
3.  **Release**: Submit for review.

## Architecture Migration Plan (Codebase)
*   **Step 1**: Migrate Database Schema (`prisma`).
*   **Step 2**: specific Feature Porting:
    *   Auth (Clerk/next-auth)
    *   Live Scoring Engine (Efficiency rewrite)
    *   Course Management
*   **Step 3**: "Join Round" & Social Features.
