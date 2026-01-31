'use client';

import { useEffect } from 'react';

export default function GlobalEnterNavigation() {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only act if key is Enter
            if (e.key !== 'Enter') return;

            // Get the current active element
            const target = e.target as HTMLElement;

            // Check if usage is within an input field (text, number, password, etc)
            // We generally don't want this behavior on buttons or links, mostly just data entry
            const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';

            if (!isInput) return;

            // If it's a textarea, we might want to allow normal Enter behavior (new line)
            // unless Ctrl+Enter or something, but usually simple Enter in textarea adds a line.
            // Let's exclude textarea from "move next" to imply standard behavior, 
            // OR ONLY allow it if shift is not held (standard form behavior depends).
            // For now, let's keep it simple: Textarea Enter = New Line.
            if (target.tagName === 'TEXTAREA') return;

            // Prevent default form submission or normal Enter behavior
            e.preventDefault();

            // Find all focusable elements
            // We query the whole document or the current form if available
            const form = (target as any).form;
            let focusableElements: HTMLElement[];

            if (form) {
                // If inside a form, constrain to that form
                focusableElements = Array.from(form.elements) as HTMLElement[];
            } else {
                // Fallback: query all inputs in the document (less reliable order but works for simpler structures)
                const query = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])';
                focusableElements = Array.from(document.querySelectorAll(query)) as HTMLElement[];
            }

            // Filter only truly visible/tabbable elements could be complex, 
            // but form.elements is usually good.
            // We want to skip hidden inputs, buttons that aren't the primary action, etc.
            // For "Move to next field", we usually want the next INPUT/SELECT.

            const currentIndex = focusableElements.indexOf(target);

            if (currentIndex > -1) {
                // Traverse forward to find the next usable input
                for (let i = currentIndex + 1; i < focusableElements.length; i++) {
                    const next = focusableElements[i];

                    // Skip hidden inputs, radio/checkboxes if desired (though navigating them is fine),
                    // and maybe buttons if we want to skip submission until the end.
                    // User request: "make enter field ... move to next field" implies inputs.

                    const tagName = next.tagName;
                    const type = (next as any).type;

                    if (
                        (tagName === 'INPUT' && type !== 'hidden') ||
                        tagName === 'SELECT' ||
                        tagName === 'TEXTAREA'
                    ) {
                        next.focus();
                        // Select text to allow easy replacement of standard values like '0'
                        if (tagName === 'INPUT') {
                            try {
                                (next as HTMLInputElement).select();
                            } catch (e) {
                                // Some inputs might not support selection (e.g. checkbox)
                            }
                        }
                        return;
                    }
                }

                // If no more inputs, maybe trigger the submit button?
                // Or just do nothing. User specifically asked to "move to next field".
            }
        };

        // Capture phase to ensure we get it before other handlers if necessary, 
        // or Bubbling is fine. Let's use Bubbling (default).
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return null; // Render nothing
}
