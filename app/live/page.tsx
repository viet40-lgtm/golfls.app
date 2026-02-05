import { prisma } from '@/lib/prisma';
import LiveScoreClient from './LiveScoreClient';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata = {
    title: {
        absolute: "Golf Live Scores - GolfLS.app",
    },
};

import { ensureRoundHasShortId } from '@/app/actions/ensure-short-id';

async function LiveScorePageContent(props: { searchParams: Promise<{ roundId?: string }> }) {
    const resolvedSearchParams = await props.searchParams;
    const roundIdFromUrl = resolvedSearchParams.roundId;

    // Check if user is authenticated
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('auth_status')?.value === 'true';
    const sessionUserId = cookieStore.get('session_userId')?.value;

    if (!isAuthenticated || !sessionUserId) {
        redirect('/');
    }

    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    // Fetch ONLY the player name for the welcome message (very light)
    let currentUserName = 'Player';
    try {
        const profile = await prisma.player.findUnique({
            where: { id: sessionUserId },
            select: { name: true }
        });
        if (profile?.name) currentUserName = profile.name;
    } catch (e) {
        console.error("Minimal profile fetch failed:", e);
    }

    // Resolve Today's Date (Chicago)
    let todayStr = new Date().toISOString().split('T')[0];
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Chicago',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        todayStr = formatter.format(new Date());
    } catch (e) { }

    return (
        <LiveScoreClient
            allPlayers={[]}
            defaultCourse={null}
            allCourses={[]}
            initialRound={null} // Feched by client
            todayStr={todayStr}
            allLiveRounds={[]} // Fetched by client
            isAdmin={isAdmin}
            currentUserId={sessionUserId}
            currentUserName={currentUserName}
            lastUsedCourseId={null}
            lastUsedTeeBoxId={null}
            roundIdFromUrl={roundIdFromUrl}
        />
    );
}

export default async function LiveScorePage(props: { searchParams: Promise<{ roundId?: string }> }) {
    try {
        return await LiveScorePageContent(props);
    } catch (e: any) {
        // ESSENTIAL: Re-throw redirect errors so Next.js can handle them
        if (e.digest?.startsWith('NEXT_REDIRECT') || e.message?.includes('NEXT_REDIRECT')) throw e;
        if (e.digest?.startsWith('NEXT_NOT_FOUND')) throw e;

        console.error("CRITICAL LIVE PAGE ERROR:", e);
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white text-black">
                <h1 className="text-xl font-black uppercase tracking-tighter mb-4">Error Loading Live Round</h1>
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded w-full max-w-lg mb-6 overflow-auto font-mono text-xs">
                    <p className="font-bold mb-2">System Message:</p>
                    {e.message || "Unknown Error"}
                    {e.digest && <p className="mt-2 text-zinc-400 mt-2">Digest: {e.digest}</p>}
                    <p className="mt-4 text-zinc-500 italic">This error usually happens when data payload is too large or data is malformed.</p>
                </div>
                <a href="/" className="px-8 py-4 bg-black text-white rounded-full font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform">
                    Return Home
                </a>
            </div>
        );
    }
}
