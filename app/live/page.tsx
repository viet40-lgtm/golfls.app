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

async function LiveScorePageContent(props: { searchParams: Promise<{ roundId?: string }> }) {
    const resolvedSearchParams = await props.searchParams;
    // SIMPLIFICATION: Ignore URL roundId as requested
    // const roundIdFromUrl = resolvedSearchParams.roundId;

    // Check if user is authenticated via cookies ONLY (fast)
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('auth_status')?.value === 'true';
    const sessionUserId = cookieStore.get('session_userId')?.value;

    if (!isAuthenticated || !sessionUserId) {
        redirect('/');
    }

    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    // DIAGNOSTIC change: Bypass Prisma entirely for the page render
    const currentUserName = 'GolfLS Player';

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
            initialRound={null}
            todayStr={todayStr}
            allLiveRounds={[]}
            isAdmin={isAdmin}
            currentUserId={sessionUserId}
            currentUserName={currentUserName}
            lastUsedCourseId={null}
            lastUsedTeeBoxId={null}
        // roundIdFromUrl={roundIdFromUrl}  <-- REMOVED
        />
    );
}

export default async function LiveScorePage(props: { searchParams: Promise<{ roundId?: string }> }) {
    try {
        return await LiveScorePageContent(props);
    } catch (e: any) {
        if (e.digest?.startsWith('NEXT_REDIRECT') || e.message?.includes('NEXT_REDIRECT')) throw e;

        console.error("DIAGNOSTIC PAGE ERROR:", e);
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white text-black">
                <h1 className="text-xl font-black uppercase tracking-tighter mb-4">Diagnostic Load Failure</h1>
                <pre className="text-xs font-mono bg-red-50 p-4 border border-red-200 w-full overflow-auto">
                    {String(e.stack || e.message || e)}
                </pre>
            </div>
        );
    }
}
