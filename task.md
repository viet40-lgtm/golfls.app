# Project Task List

## Active Status: Polishing for Play Store

---

### ✅ Completed Tasks

#### UI/UX Redesign
- [x] Clear stuck node processes and restart localhost server.
- [x] Implement Premium Leaderboard layout.
- [x] Fix Hole Number/Score alignment in leaderboard cells.
- [x] Remove Par labels from hole grid for cleaner look.
- [x] Consolidate Login flow to a single root route.
- [x] Fix high-contrast input styles for sunlight visibility.
- [x] Change GRS and HCP number colors to black for better legibility.

#### Bug Fixes & Optimization
- [x] Fix "Save Hole" race condition (async/await implementation).
- [x] Remove duplicate `/login` routes and unused components.
- [x] Implement local backup for scores to prevent data loss on refresh.
- [x] Optimize build size by cleaning up obsolete files.

#### Data Migration
- [x] Migrate Viet Chu's last 20 rounds from Rescue DB to Target DB.
- [x] Link unlinked historical players to their profiles.

---

### ⏳ Pending - High Priority

#### Vercel Deployment
[x] Push changes to Vercel
- [x] Stage and commit all pending changes
- [x] Push to remote repository
- [x] Verify Vercel deployment status

#### Play Store Readiness (Phase 3)
- [ ] Implement `assetlinks.json` verification.
- [ ] Configure Bubblewrap for Android build.
- [ ] Generate Production `.aab` file.
- [ ] Create Play Store Graphics (Screenshots, Feature Graphic).

#### Core Logic Refinement
- [ ] Implement "Lock Round" logic for historic (non-today) rounds.
- [ ] Trigger final Handicap Index recalculation for all players.
- [ ] Finalize "Push All" batch sync stability.

---

### 📅 Future Roadmap

- [ ] QR Code "Join Group" feature.
- [ ] Integrated GPS course mapping integration.
- [ ] Automated weekly handicap reports via email (Resend).
