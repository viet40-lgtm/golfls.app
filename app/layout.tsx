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
    title: {
        default: "Golf Live Scores - GolfLS.app",
        template: "%s - GolfLS.app",
        absolute: "Golf Live Scores - GolfLS.app"
    },
    description: "Live score tracking and handicap management for real-time golf rounds.",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Golf Live Scores",
    },
    themeColor: "#ffffff",
    icons: {
        apple: "/icon-512.png",
    },
};

import AppHeader from "@/components/AppHeader";
import GlobalEnterNavigation from "@/components/GlobalEnterNavigation";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('auth_status')?.value === 'true' && !!cookieStore.get('session_userId')?.value;

    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="icon" href="/icon-192.png" sizes="192x192" />
                <link rel="icon" href="/icon-512.png" sizes="512x512" />
                <link rel="shortcut icon" href="/icon-192.png" />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning
            >
                <ServiceWorkerRegistration />
                {isAuthenticated && <AppHeader />}
                <GlobalEnterNavigation />
                {children}
            </body>
        </html>
    );
}
