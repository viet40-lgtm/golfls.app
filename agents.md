# Agent Rules (G-GolfLS)

This project follows specific UI/UX patterns to ensure a premium, high-contrast mobile experience.

### Main Rules:
1. **Fullscreen Everything**: All modals, popups, and settings pages must be fullscreen (`fixed inset-0`). No width constraints (`max-w-*`).
2. **Button Rounding**: Use `rounded-full` or `rounded-2xl` for all buttons.
3. **Primary Colors**: Default buttons are Black/White. Change to **Blue** (`bg-blue-600`) when a form is "dirty" (has unsaved changes).
4. **Sunlight Visibility**: Use high-contrast inputs and black text for critical data (GRS, HCP).
5. **No Horizontal Scrolling**: Always keep `overflow-x-hidden` on the body.
6. **Centered Headers**: Modal titles should be centered using spacers (`w-10`) on the left and right.
7. **Cleanup**: Incomplete past rounds (scores < 18 and not today) should be auto-deleted on `/live` page load.

8. **Local Server (AI)**: We use a local LLM (`192.168.1.67`) for code generation. The Cloud Agent (Lead) asks the Local LLM (Intern) via `scripts/query_local_llm.js` and applies the code.

See `.agent/rules.md` for more technical details.
