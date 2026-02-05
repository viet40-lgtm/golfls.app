# G-GolfLS Agent Rules

This file defines the core UI/UX standards and coding patterns for the G-GolfLS project. Antigravity agents should follow these rules strictly to ensure consistency.

## 1. Fullscreen UI Standards
- **Modals & Popups**: All modals (Scorecard, Settings, Profile, Add Player, etc.) must be **fullscreen** on both mobile and desktop.
    - Use `fixed inset-0 z-[...] bg-white flex flex-col`.
    - Do **NOT** use `max-w-*` constraints on the main modal container.
    - Do **NOT** use semi-transparent backdrops/overlays; the modal should occupy the entire viewport.
- **Headers**: Modal headers should have centered titles. Use a consistent spacer pattern:
    ```tsx
    <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md">
        <div className="w-10"></div> {/* Left Spacer */}
        <h2 className="text-lg font-black italic uppercase tracking-tighter">Title</h2>
        <div className="w-10"></div> {/* Right Spacer */}
    </div>
    ```
- **Player Selection Modal**: All internal sections (header, content, group lists) must use **minimal padding** (`p-1`) to maximize usable space on all screen sizes.

## 2. Design System & Styling
- **Button Roundness**: All buttons must be fully rounded or highly rounded. Use `rounded-full` or `rounded-2xl` depending on the surrounding context.
- **High Contrast**:
    - Use **Black on White** (`bg-black text-white`) for the default primary state.
    - Inputs should have high contrast (black text on light gray or white background) for sunlight visibility.
- **"Dirty" State Pattern**:
    - If a form or input has unsaved changes, the "Save" or "Update" button should change color to **Blue** (`bg-blue-600`).
    - Use a `hasChanges()` or `isDirty()` helper function to track this.
- **Global Layout**: Maintain `overflow-x: hidden` on the body to prevent any horizontal shifts.

## 3. Interaction & UX
- **Modal Navigation**:
    - Bottom bars must contain:
        - **Cancel**: Black background, white text (`bg-black text-white`).
        - **Save**: Black background, white text (`bg-black text-white`) by default.
        - **Save (Dirty)**: Change to Blue (`bg-blue-600`) when changes are detected.
    - Both buttons should be fixed/sticky at the bottom of the screen.
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

## 7. Shell & Environment Compatibility
- **PowerShell Separators**:
    - The user is running **Windows PowerShell v5.1** (or non-PowerShell 7 environment).
    - **NEVER** use `&&` to chain commands (e.g., `git add . && git commit...`). This causes immediate parser errors.
    - **ALWAYS** use `;` to chain commands (e.g., `git add . ; git commit...`).

## 5. Deployment & Git (CRITICAL)
- **NO AUTO-PUSH**: The agent must **NEVER** run `git push` to origin/remote *unless explicitly asked by the user*. Pushing affects production (Vercel).
- **NO AUTO-DEPLOY**: The agent must **NEVER** run deployment commands (e.g., `npx vercel --prod`).
- **Workflow**: 
    1. Make local changes.
    2. Verify locally (`npm run build` is allowed).
    3. Commit locally if needed.
    4. **STOP**. Do not push (unless instructed).
