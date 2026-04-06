import type { Metadata, Viewport } from "next";
import { TelegramProvider } from "@/components/TelegramProvider";
import { I18nProvider } from "@/context/I18nContext";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin", "cyrillic"], variable: "--font-outfit" });

export const metadata: Metadata = {
    title: "Newton Academy",
    description: "Your personalized learning dashboard inside Telegram",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#000000",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ru" className={`${outfit.variable}`}>
            <head>
                <script src="https://telegram.org/js/telegram-web-app.js" async />
            </head>
            <body className="antialiased bg-[#0a0a0f] text-white selection:bg-blue-500/30">
                <I18nProvider>
                    <TelegramProvider>
                        {children}
                    </TelegramProvider>
                </I18nProvider>
            </body>
        </html>
    );
}
