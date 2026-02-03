# Implementation Plan: Google Play Store Publishing & Final Polish

## Project: G-GolfLS Mobile App

### Goal
To transition the current Next.js web application into a published Android application on the Google Play Store using Trusted Web Activity (TWA) and finalize data integrity for all players.

---

## Part 1: Play Store Deployment (Phase 3 & 4)

### 1. Android Asset Generation
- [ ] Generate `assetlinks.json` for Digital Asset Links verification.
- [ ] Place `assetlinks.json` in `.well-known/assetlinks.json` in the `public` directory.
- [ ] Ensure `manifest.json` is fully compliant with TWA standards (standard icons, theme colors).

### 2. Bubblewrap Configuration
- [ ] Install Bubblewrap CLI: `npm install -g @bubblewrap/cli`.
- [ ] Initialize Bubblewrap in a dedicated `/android` directory.
- [ ] Configure signing keys (Upload key and Deployment key).
- [ ] Build the Android App Bundle (`.aab`).

### 3. Play Console Submission
- [ ] Set up Google Play Console account.
- [ ] Create App Listing with screenshots and feature graphics.
- [ ] Upload `.aab` to internal testing track.
- [ ] Promote to Production after validation.

---

## Part 2: Data & Logic Integrity

### 1. Handicap Recalculation
- [ ] Verify Viet Chu's migrated rounds (last 20).
- [ ] Run `scripts/trigger_recalc.ts` to ensure the Handicap Index reflects recent scores.
- [ ] Verify consistency across all active players.

### 2. Final UI Polish
- [ ] **Lock Historic Rounds**: Ensure rounds that are not from "today" are strictly view-only.
- [ ] **Offline Resilience**: Test the Service Worker to ensure the leaderboard loads even with spotty course reception.
- [ ] **Push All Sync**: Verify the "Push All" functionality in `LiveScoreClient.tsx` for batched score synchronization.

---

## Part 3: Future Enhancements (Post-V1)
- [ ] **Join Round via QR**: Allow players to join a round by scanning a QR code on another player's phone.
- [ ] **Social Feed**: A summary of recent notable rounds at local courses.
- [ ] **Global Leaderboard**: A cross-round leaderboard for local golf clubs.
