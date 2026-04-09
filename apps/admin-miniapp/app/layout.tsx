import type { Metadata } from 'next'
import './globals.css'
import { TelegramProvider } from '@/components/TelegramProvider'
import Script from 'next/script'

export const metadata: Metadata = {
    title: 'Newton Academy Admin',
    description: 'Панель управления Newton Academy',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ru">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
            </head>
            <body className="bg-[#0f0f1a] text-white min-h-screen antialiased">
                <TelegramProvider>
                    {children}
                </TelegramProvider>
            </body>
        </html>
    )
}
