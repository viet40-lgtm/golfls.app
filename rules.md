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

## 9. Universal Button Styling
- **Delete Buttons**: Always white text on a red background (`bg-red-600 text-white`).
- **Save Buttons**:
    - **Default (No Changes)**: White text on a black background (`bg-black text-white`).
    - **Data Changed**: White text on a blue background (`bg-blue-600 text-white`).
    - **Revert logic**: If a user changes data but then reverts it back to the original state within the same session/modal, the button must revert to the "Default" black styling.
- **Generic Buttons**: All other buttons must be white text on a black background (`bg-black text-white`).
- **Standardization**: Apply these color rules consistently across all components, modals, and pages.

## 10. Universal Popup Styling
- **Fullscreen**: All popups/modals must be fullscreen (`fixed inset-0 z-50 bg-white`).
- **Padding**: Set padding to 1 on all sides (`p-1`).
- **Close Button**:
    - **Position**: Top right corner (`absolute top-2 right-2` or similar).
    - **Styling**: White 'X' on black background (`size-8 flex items-center justify-center bg-black text-white rounded-full font-bold shadow-md`).
    - **Function**: Cancel and close the popup without saving.
- **Save Button**:
    - **Position**: Fixed at the bottom of the screen or bottom of the content area.
    - **Visibility**: Only show if there is data to be changed/saved.
    - **Styling**: Consistent with "Universal Button Styling" (Blue if changed, Black if default).

## 11. FBT (Front/Back/Total) Game Rules

### Overview
FBT is a classic Nassau betting game where players compete head-to-head across three separate segments of a round.

### The Three Games
Each player plays **three separate games** simultaneously:
1. **Front 9** - Holes 1-9
2. **Back 9** - Holes 10-18  
3. **Total 18** - All 18 holes

### Entry Fee Structure
If the entry fee is **$10**, each player is playing for:
- Front 9: $10
- Back 9: $10
- Total 18: $10
- **Total at risk: $30 per player**

### How to Win
- **Lowest net score wins** each segment
- Each segment is an **independent bet**
- Players compete **head-to-head** against every other player in the pool

### Payout Calculation (Head-to-Head)
For each segment (Front/Back/Total), every player plays against every other player:

#### Example with 2 Players (Entry Fee: $10)
| Segment | Player A Score | Player B Score | Winner | Payout |
|---------|---------------|----------------|---------|---------|
| Front 9 | 38 | 40 | Player A | Player A wins $10 from Player B |
| Back 9 | 42 | 39 | Player B | Player B wins $10 from Player A |
| Total 18 | 80 | 79 | Player B | Player B wins $10 from Player A |

**Net Result:**
- Player A: -$10 (won $10, lost $20)
- Player B: +$10 (won $20, lost $10)

#### Example with 3 Players (Entry Fee: $10)
Each player plays 2 opponents per segment.

**Front 9 Results:**
- Player A: 38 (wins against B and C) → +$20
- Player B: 40 (loses to A, wins against C) → $0
- Player C: 42 (loses to A and B) → -$20

**Back 9 Results:**
- Player A: 39 (wins against B, loses to C) → $0
- Player B: 42 (loses to A and C) → -$20
- Player C: 37 (wins against A and B) → +$20

**Total 18 Results:**
- Player A: 77 (wins against B and C) → +$20
- Player B: 82 (loses to A and C) → -$20
- Player C: 79 (loses to A, wins against B) → $0

**Net Result:**
- Player A: +$40 (won 5 bets, lost 1)
- Player B: -$40 (won 1 bet, lost 5)
- Player C: $0 (won 3 bets, lost 3)

### Ties (Push)
- If two players tie on a segment, **no money changes hands** for that matchup
- Example: Player A scores 38, Player B scores 38 on Front 9 → Push, $0 exchanged

### Important Notes
1. **Net scores are used** (gross score minus handicap strokes)
2. **Each segment is independent** - you can win one, lose one, and push one
3. **Head-to-head format** - you play against every other player in the pool
4. **Ties push** - no winner, no payout for that specific matchup
5. With N players, each player has (N-1) matchups per segment, for a total of 3×(N-1) bets

### Calculation Formula
For a player in a pool of N players with entry fee E:
- **Maximum win per segment:** E × (N-1) [beat everyone]
- **Maximum loss per segment:** E × (N-1) [lose to everyone]
- **Maximum total win:** 3 × E × (N-1) [win all three segments against everyone]
- **Maximum total loss:** 3 × E × (N-1) [lose all three segments to everyone]
