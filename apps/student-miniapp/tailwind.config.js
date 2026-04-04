/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Telegram Theme mapping
                tg: {
                    bg: "var(--tg-theme-bg-color, #ffffff)",
                    text: "var(--tg-theme-text-color, #000000)",
                    hint: "var(--tg-theme-hint-color, #999999)",
                    link: "var(--tg-theme-link-color, #2481cc)",
                    button: "var(--tg-theme-button-color, #2481cc)",
                    "button-text": "var(--tg-theme-button-text-color, #ffffff)",
                    secondary: "var(--tg-theme-secondary-bg-color, #f0f0f0)",
                    accent: "#2481cc",
                },
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
            },
        },
    },
    plugins: [],
};
