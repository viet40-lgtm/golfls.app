import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-jetbrains-mono",
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: {
        default: "Golf Live Scores - GolfLS.app",
        template: "%s - GolfLS.app",
        absolute: "Golf Live Scores - GolfLS.app"
    },
    description: "Live score tracking and handicap management for real-time golf rounds.",
    manifest: "/manifest.json",
    icons: {
        icon: [
            { url: "/icon-192.png", sizes: "192x192" },
            { url: "/icon-512.png", sizes: "512x512" },
        ],
        shortcut: "/icon-192.png",
        apple: "/icon-512.png",
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Golf Live Scores",
    },
    // viewports are now a separate export in Next.js 14+, but for now we put other metas here if needed or separate
};

export const viewport = {
    themeColor: "#ffffff",
};

import AppHeader from "@/components/AppHeader";
import GlobalEnterNavigation from "@/components/GlobalEnterNavigation";
// import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('auth_status')?.value === 'true' && !!cookieStore.get('session_userId')?.value;

    return (
        <html lang="en" suppressHydrationWarning>

            <body
                className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
                suppressHydrationWarning
            >
                {/* <ServiceWorkerRegistration /> */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                        if ('serviceWorker' in navigator) {
                            navigator.serviceWorker.getRegistrations().then(registrations => {
                                for (let registration of registrations) {
                                    registration.unregister();
                                }
                            });
                        }
                    `,
                    }}
                />
                {isAuthenticated && <AppHeader />}
                <GlobalEnterNavigation />
                {children}
            </body>
        </html>
    );
}
