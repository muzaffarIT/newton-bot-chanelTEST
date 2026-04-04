import type { Metadata, Viewport } from "next";
import { TelegramProvider } from "@/components/TelegramProvider";
import { I18nProvider } from "@/context/I18nContext";
import "./globals.css";

export const metadata: Metadata = {
    title: "Newton Academy — Student Cabinet",
    description: "Your personalized learning dashboard inside Telegram",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ru">
            <head>
                <script src="https://telegram.org/js/telegram-web-app.js" async />
            </head>
            <body>
                <I18nProvider>
                    <TelegramProvider>
                        {children}
                    </TelegramProvider>
                </I18nProvider>
            </body>
        </html>
    );
}
