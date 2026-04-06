/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-outfit)', 'sans-serif'],
            },
            colors: {
                // Telegram Theme mapping mapped to a dark premium tone if fallback
                tg: {
                    bg: "var(--tg-theme-bg-color, #0a0a0f)",
                    text: "var(--tg-theme-text-color, #ffffff)",
                    hint: "var(--tg-theme-hint-color, #8e8e93)",
                    link: "var(--tg-theme-link-color, #3390ec)",
                    button: "var(--tg-theme-button-color, #3390ec)",
                    "button-text": "var(--tg-theme-button-text-color, #ffffff)",
                    secondary: "var(--tg-theme-secondary-bg-color, #13131c)",
                    accent: "#3390ec",
                },
                // Add premium dark mode colors
                premium: {
                    dark: "#0a0a0f",
                    card: "#13131c",
                    border: "rgba(255, 255, 255, 0.08)",
                    glow: "rgba(51, 144, 236, 0.5)",
                }
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            boxShadow: {
                'neon': '0 0 20px rgba(51, 144, 236, 0.3)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }
        },
    },
    plugins: [],
};
