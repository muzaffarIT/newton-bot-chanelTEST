import type { Metadata, Viewport } from "next";
import { TelegramProvider } from "@/components/TelegramProvider";
import { I18nProvider } from "@/context/I18nContext";
import { Montserrat } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const outfit = Montserrat({ subsets: ["latin", "cyrillic"], variable: "--font-outfit" });

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
                <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
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
