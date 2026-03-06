import { prisma } from '@/lib/prisma';
import LiveScoreClient from './LiveScoreClient';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function LiveScorePage(props: { searchParams: Promise<{ roundId?: string }> }) {
    const resolvedSearchParams = await props.searchParams;
    const roundIdFromUrl = resolvedSearchParams.roundId;

    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const todayStr = formatter.format(new Date());

    // --- OPTIMIZATION: Concurrently fetch all independent, heavily used tables ---
    const [
        cookieStore,
        defaultCourseResult,
        allCourses,
        oldUnfinishedRounds,
        allLiveRounds,
        allPlayers
    ] = await Promise.all([
        cookies(),
        prisma.course.findFirst({
            where: { name: { contains: 'City Park North' } },
            include: { teeBoxes: true, holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } } }
        }),
        prisma.course.findMany({
            include: { teeBoxes: true, holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } } },
            orderBy: { name: 'asc' }
        }),
        prisma.liveRound.findMany({
            where: { date: { lt: todayStr } },
            include: { players: { include: { scores: true } } }
        }),
        prisma.liveRound.findMany({
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, date: true, createdAt: true }
        }),
        prisma.player.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, handicapIndex: true, preferredTeeBox: true, email: true }
        })
    ]);

    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    let defaultCourse = defaultCourseResult;
    if (!defaultCourse) {
        defaultCourse = await prisma.course.findFirst({
            include: { teeBoxes: true, holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } } }
        });
    }

    // --- OPTIMIZED CLEANUP: Fire-and-forget deletion of old unfinished rounds ---
    try {
        const idsToDelete = oldUnfinishedRounds
            .filter(r => r.players.length === 0 || r.players.some(p => p.scores.length < 18))
            .map(r => r.id);

        if (idsToDelete.length > 0) {
            console.log(`[Cleanup] Deleting ${idsToDelete.length} unfinished old rounds async...`);
            prisma.liveRound.deleteMany({ where: { id: { in: idsToDelete } } }).catch(e => console.error(e));
        }
    } catch (error) {
        console.error('[Cleanup] Failed:', error);
    }

    let activeRound: any = null;

    // Priority A: Load from URL
    if (roundIdFromUrl) {
        activeRound = await prisma.liveRound.findUnique({
            where: { id: roundIdFromUrl },
            include: {
                players: {
                    include: { player: true, scores: { include: { hole: true } } }
                }
            }
        });
        if (activeRound) console.log('LOG-4: Loaded URL round:', activeRound.name);
    }

    // Priority B: Auto-Resolve Today's Activity
    if (!activeRound) {
        const todaysRounds = await prisma.liveRound.findMany({
            where: { date: todayStr },
            orderBy: { createdAt: 'desc' },
            include: {
                players: {
                    include: { player: true, scores: { include: { hole: true } } }
                }
            }
        });

        activeRound = todaysRounds.find(r => r.players.length === 0 || r.players.some(p => p.scores.length < 18));

        if (!activeRound && todaysRounds.length === 0) {
            const { createDefaultLiveRound } = await import('@/app/live/actions/create-live-round');
            const result = await createDefaultLiveRound(todayStr);
            if (result.success && result.roundId) {
                console.log('LOG-5: Auto-created new round for today:', result.roundId);
                return redirect(`/live?roundId=${result.roundId}`);
            }
        }

        if (!activeRound) {
            activeRound = await prisma.liveRound.findFirst({
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
                include: {
                    players: { include: { player: true, scores: { include: { hole: true } } } }
                }
            });
        }
    }

    // Redirect to ensure ID is in URL (Fastest path to join)
    if (!roundIdFromUrl && activeRound) {
        return redirect(`/live?roundId=${activeRound.id}`);
    }

    if (activeRound?.courseId) {
        const roundCourse = await prisma.course.findUnique({
            where: { id: activeRound.courseId },
            include: { teeBoxes: true, holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } } }
        });
        if (roundCourse) {
            defaultCourse = roundCourse;
        }
    }

    return (
        <LiveScoreClient
            allPlayers={allPlayers.map(p => ({ ...p, index: p.handicapIndex ?? 0 }))}
            defaultCourse={defaultCourse ? JSON.parse(JSON.stringify(defaultCourse)) : null}
            allCourses={JSON.parse(JSON.stringify(allCourses))}
            initialRound={activeRound ? JSON.parse(JSON.stringify(activeRound)) : null}
            todayStr={todayStr}
            allLiveRounds={allLiveRounds.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))}
            isAdmin={isAdmin}
        />
    );
}
