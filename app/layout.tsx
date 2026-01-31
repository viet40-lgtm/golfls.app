import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "GolfLS.app",
    description: "Live score tracking and handicap management for real-time golf rounds.",
};

import AppHeader from "@/components/AppHeader";
import GlobalEnterNavigation from "@/components/GlobalEnterNavigation";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { getSession } from "@/lib/auth";

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('auth_status')?.value === 'true' && !!cookieStore.get('session_userId')?.value;

    let userPlayerId: string | null = null;

    if (isAuthenticated) {
        try {
            const session = await getSession();
            if (session?.playerId) {
                userPlayerId = session.playerId;
            }
        } catch (error) {
            console.error('Error fetching playerId in layout:', error);
        }
    }

    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/icon-512.png" />
                <meta name="theme-color" content="#000000" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black" />
                <meta name="apple-mobile-web-app-title" content="GolfLS" />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning
            >
                <ServiceWorkerRegistration />
                {isAuthenticated && <AppHeader playerId={userPlayerId} />}
                <GlobalEnterNavigation />
                {children}
            </body>
        </html>
    );
}
