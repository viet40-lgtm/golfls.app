# G-GolfLS Agent Rules
This file defines the core UI/UX standards and coding patterns for the G-GolfLS project.

## 1. UI/UX Standards (Mobile-First)
- **Top Bar**:
    - Sticky header with `z-50`.
    - Contains strictly: Application Title (left) and current Page Title (center/right).
    - **NO** other buttons (like "Exit Round") in the top bar. All functional buttons belong in the **Action Bar**.
- **Action Bar (Bottom)**:
    - Fixed bottom position, sticky `z-40`.
    - Contains primary actions for the current context (e.g., "Exit Round", "Scorecard", "Refresh").
    - Button styling: Minimalist, clear iconography, touch-friendly targets.
- **Round Info Overlay**:
    - Display Course Name, Tee Box, and Date at the **top of the screen**, just below the main header.
    - Styling: Subtle, non-intrusive text (e.g., small font, gray color) to inform the user without distracting from scoring.
- **Layout**:
    - **Fullscreen Mode**: All primary views (Login, Home, Live Scoring) must occupy the full viewport height (`min-h-screen`).
    - **Padding**: Use padding of `1` (approx `0.25rem` or `4px`) for main content containers to maximize screen real estate on mobile devices.
    - **Popups/Modals**: Must be fullscreen on mobile (`fixed inset-0`) with minimal padding (`p-1`).

## 2. Live Scoring Logic
- **State Synchronization**:
    - **Single Source of Truth**: The database (Prisma) is the master. Local state is for UI responsiveness.
    - **Optimistic Updates**: Update UI immediately, then sync to server. Handle partial failures gracefully.
    - **No Locking**: Do **NOT** implement device locking or "scorer ownership". Any user can edit any score at any time. The last write wins.
    - **Conflict Resolution**: Rely on "last write wins" at the database level.
- **Player Management**:
    - **Active Players**: Only show players explicitly added to the round.
    - **Search**: "Add Player" search should exclude players already in the round.
    - **Guest Players**: Allow creating guests with minimal info (Name only required).

## 3. Component Patterns
- **Modals**:
    - Use `LivePlayerSelectionModal` for managing players.
    - Use `GuestPlayerModal` for creating temporary players.
    - Both must be fullscreen with persistent "Close" and "Save" buttons.
    - Buttons should be fixed/sticky at the bottom of the screen.
- **Input Patterns**:
    - Hole score inputs should have `aria-label` for accessibility.
    - Use `inputMode="numeric"` or `inputMode="decimal"` for mobile keyboards.
- **Confirmations & Prompts**:
    - **NEVER** use native browser `confirm()` or `prompt()` dialogs.
    - **ALWAYS** use the custom `ConfirmModal` for confirmations.
    - For sensitive actions requiring a password (like deleting a guest), implement a dedicated field within the modal or a specific password entry popup.
    - Use `ConfirmModal` for destructive actions (Delete) or taking over scorekeeping from another user.

## 4. Coding Standards
- **Prisma Deletions**: Ensure cascading deletions are handled (e.g., deleting a `LiveRound` cleans up `LiveRoundPlayer` and `LiveScore`).
- **Data Cleanup**: Automatically delete incomplete past rounds (date != today + scores < hole count) upon landing on the `/live` page to keep the history clean.
- **State Management**: Use `JSON.stringify` on objects/arrays within `useEffect` dependencies or `useMemo` to prevent infinite re-render loops.

## 5. Deployment & Git (CRITICAL)
- **NO AUTO-PUSH**: The agent must **NEVER** run `git push` to origin/remote. Pushing affects production (Vercel) and is the **USER'S RESPONSIBILITY**.
- **NO AUTO-DEPLOY**: The agent must **NEVER** run deployment commands (e.g., `npx vercel --prod`).
- **Workflow**:
    1. Make local changes.
    2. Verify locally (`npm run build` is allowed).
    3. Commit locally if needed.
    4. **STOP**. Do not push. User will handle deployment manually.

## 6. Shell & Environment Compatibility
- **PowerShell Separators**:
    - The user is running **Windows PowerShell v5.1** (or non-PowerShell 7 environment).
    - **NEVER** use `&&` to chain commands (e.g., `git add . && git commit...`). This causes immediate parser errors.
    - **ALWAYS** use `;` to chain commands (e.g., `git add . ; git commit...`).

## 7. New UI Rules (Added 2026-02-06)
- **Fullscreen & Padding**: 
   - All **pages**, **popups** (modals), and **pulldowns** (dropdowns) must be designed to be **fullscreen** on both desktop and mobile.
   - All such containers must have a **padding of 1** on all sides (`p-1` or equivalent).
   - *Goal*: Maximize screen real estate while maintaining a uniform, minimal safe area.

## 8. Agent Instructions (Meta-Rules)
- **Modify, Don't Replace**:
    - When updating project rules or agent instructions, **ALWAYS** append or edit the existing `rules.md` file.
    - **NEVER** delete and recreate `rules.md` unless explicitly instructed to "reset" the rules.
    - Treat `rules.md` as the persistent source of truth for project standards.
