import { prisma } from '@/lib/prisma';
import LiveScoreClient from './LiveScoreClient';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUserRounds } from '@/app/actions/get-user-rounds';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata = {
    title: {
        absolute: "Golf Live Scores - GolfLS.app",
    },
};

export default async function LiveScorePage(props: { searchParams: Promise<{ roundId?: string }> }) {
    const resolvedSearchParams = await props.searchParams;
    const roundIdFromUrl = resolvedSearchParams.roundId;

    // Check if user is authenticated
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('auth_status')?.value === 'true';
    const sessionUserId = (await cookieStore).get('session_userId')?.value;

    if (!isAuthenticated || !sessionUserId) {
        redirect('/login');
    }

    // Check if user is admin
    const isAdmin = (await cookieStore).get('admin_session')?.value === 'true';

    // Fetch User Rounds History
    const userRoundsHistory = sessionUserId ? await getUserRounds(sessionUserId) : [];

    // 1. Get default course
    let defaultCourse = await prisma.course.findFirst({
        where: { name: { contains: 'City Park North' } },
        include: {
            teeBoxes: true,
            holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } }
        }
    });

    if (!defaultCourse) {
        defaultCourse = await prisma.course.findFirst({
            include: { teeBoxes: true, holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } } }
        });
    }

    // 1b. Get ALL courses for selection
    const allCourses = await prisma.course.findMany({
        include: {
            teeBoxes: true,
            holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } }
        },
        orderBy: { name: 'asc' }
    });

    // 2. Resolve Today's Date (Chicago)
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const todayStr = formatter.format(new Date()); // Returns YYYY-MM-DD

    let activeRound: any = null;
    let lastUsedCourseId = null;
    let lastUsedTeeBoxId = null;

    // 2b. Find the most recent round the user participated in
    const lastUserRoundPlayer = await prisma.liveRoundPlayer.findFirst({
        where: { playerId: sessionUserId },
        orderBy: { liveRound: { date: 'desc' } },
        include: { liveRound: true }
    });

    if (lastUserRoundPlayer) {
        lastUsedCourseId = lastUserRoundPlayer.liveRound.courseId;
        lastUsedTeeBoxId = lastUserRoundPlayer.teeBoxId;
    }

    // 3. Priority A: Load from URL (Admin only for old rounds)
    if (roundIdFromUrl) {
        activeRound = await prisma.liveRound.findUnique({
            where: { id: roundIdFromUrl },
            include: {
                players: {
                    include: {
                        player: true,
                        scores: { include: { hole: true } }
                    }
                }
            }
        });
    }

    // 4. Priority B: Load User's Last Round
    if (!activeRound && lastUserRoundPlayer) {
        activeRound = await prisma.liveRound.findUnique({
            where: { id: lastUserRoundPlayer.liveRoundId },
            include: {
                players: {
                    include: {
                        player: true,
                        scores: { include: { hole: true } }
                    }
                }
            }
        });
    }

    // 5. Priority C: Load Latest Global Round (priority: last Saturday, then latest)
    if (!activeRound) {
        const recentRounds = await prisma.liveRound.findMany({
            orderBy: { date: 'desc' },
            take: 20,
            select: { id: true, date: true }
        });

        const saturdayRound = recentRounds.find(r => {
            const [y, m, d] = r.date.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            return date.getDay() === 6;
        });

        const targetId = saturdayRound ? saturdayRound.id : recentRounds[0]?.id;

        if (targetId) {
            activeRound = await prisma.liveRound.findUnique({
                where: { id: targetId },
                include: {
                    players: {
                        include: {
                            player: true,
                            scores: { include: { hole: true } }
                        }
                    }
                }
            });
        }
    }

    if (!activeRound) {
        console.log('LOG-13: No rounds exist. Rendering empty state.');
    }

    // 8. Redirect to ensure ID is in URL (Updated to redirect to /live instead of root)
    if (!roundIdFromUrl && activeRound) {
        return redirect(`/live?roundId=${activeRound.id}`);
    }

    // 9. If activeRound has a specific course_id, use that as the defaultCourse
    if (activeRound?.courseId) {
        const roundCourse = await prisma.course.findUnique({
            where: { id: activeRound.courseId },
            include: {
                teeBoxes: true,
                holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } }
            }
        });
        if (roundCourse) {
            defaultCourse = roundCourse;
        }
    }

    // 10. Get rounds for list
    const allLiveRounds = await prisma.liveRound.findMany({
        where: {},
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, date: true, createdAt: true }
    });

    // 11. Get current user and friends if logged in
    const currentUserId = (await cookieStore).get('session_userId')?.value;
    let filteredPlayers = [];

    const playersRaw = await prisma.player.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, handicapIndex: true, preferredTeeBox: true, email: true }
    });
    const playersMapped = playersRaw.map(p => ({ ...p, index: p.handicapIndex, preferred_tee_box: p.preferredTeeBox }));

    if (currentUserId && !isAdmin) {
        const userRounds = await prisma.liveRoundPlayer.findMany({
            where: { playerId: currentUserId },
            select: { liveRoundId: true }
        });
        const roundIds = userRounds.map(r => r.liveRoundId);

        const friendIds = await prisma.liveRoundPlayer.findMany({
            where: { liveRoundId: { in: roundIds } },
            select: { playerId: true }
        });
        const uniqueFriendIds = new Set(friendIds.map(f => f.playerId).filter(id => id !== null));
        uniqueFriendIds.add(currentUserId);

        filteredPlayers = playersMapped.filter(p => uniqueFriendIds.has(p.id));
    } else {
        filteredPlayers = playersMapped;
    }

    return (
        <LiveScoreClient
            allPlayers={filteredPlayers}
            defaultCourse={defaultCourse ? JSON.parse(JSON.stringify(defaultCourse)) : null}
            allCourses={JSON.parse(JSON.stringify(allCourses))}
            initialRound={activeRound ? JSON.parse(JSON.stringify(activeRound)) : null}
            todayStr={todayStr}
            allLiveRounds={allLiveRounds.map(r => ({ ...r, created_at: r.createdAt.toISOString() }))}
            isAdmin={isAdmin}
            currentUserId={sessionUserId}
            lastUsedCourseId={lastUsedCourseId}
            lastUsedTeeBoxId={lastUsedTeeBoxId}
            userRoundsHistory={userRoundsHistory}
        />
    );
}
