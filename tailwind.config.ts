import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                golf: {
                    light: "#2d5a27",
                    DEFAULT: "#1e3d1a",
                    dark: "#0f1f0d",
                },
                accent: {
                    gold: "#d4af37",
                    silver: "#c0c0c0",
                }
            },
        },
    },
    plugins: [],
};
export default config;
