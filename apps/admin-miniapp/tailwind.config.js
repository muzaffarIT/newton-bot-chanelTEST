/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                tg: {
                    bg: 'var(--tg-bg)',
                    text: 'var(--tg-text)',
                    hint: 'var(--tg-hint)',
                    button: 'var(--tg-button)',
                    'button-text': 'var(--tg-button-text)',
                    'secondary-bg': 'var(--tg-secondary-bg)',
                },
            },
        },
    },
    plugins: [],
}
