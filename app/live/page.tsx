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

    // Check if user is admin
    const cookieStore = await cookies();
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

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

    // --- CRITICAL ORDER OF OPERATIONS (DO NOT CHANGE) ---
    // 1. CLEANUP: Clear old unfinished rounds first to avoid resolving to them.
    // 2. URL PRIORITY: Honor direct links to specific rounds.
    // 3. TODAY'S ACTIVITY: Auto-join unfinished or newest round for today.
    // 4. AUTO-CREATE: If absolutely no round exists for today, create one instantly.
    // 5. REDIRECT: Ensure the browser URL always reflects the resolved Round ID.
    // ----------------------------------------------------

    // 2. Resolve Today's Date (Chicago)
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const todayStr = formatter.format(new Date()); // Returns YYYY-MM-DD

    // --- OPTIMIZED CLEANUP: Delete unfinished rounds from previous days ---
    try {
        const oldUnfinishedRounds = await prisma.liveRound.findMany({
            where: { date: { lt: todayStr } },
            include: { players: { include: { scores: true } } }
        });

        const idsToDelete = oldUnfinishedRounds
            .filter(r => r.players.length === 0 || r.players.some(p => p.scores.length < 18))
            .map(r => r.id);

        if (idsToDelete.length > 0) {
            console.log(`[Cleanup] Deleting ${idsToDelete.length} unfinished old rounds`);
            await prisma.liveRound.deleteMany({ where: { id: { in: idsToDelete } } });
        }
    } catch (error) {
        console.error('[Cleanup] Failed to delete unfinished old rounds:', error);
    }
    // -----------------------------------------------------------

    let activeRound: any = null;

    // 3. Priority A: Load from URL
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
        if (activeRound) console.log('LOG-4: Loaded URL round:', activeRound.name);
    }

    // 4. Priority B: Auto-Resolve Today's Activity
    if (!activeRound) {
        // Find if there's any round for today
        const todaysRounds = await prisma.liveRound.findMany({
            where: { date: todayStr },
            orderBy: { createdAt: 'desc' },
            include: {
                players: {
                    include: {
                        player: true,
                        scores: { include: { hole: true } }
                    }
                }
            }
        });

        // 4a. If rounds exist for today, find the first active/unfinished one
        activeRound = todaysRounds.find(r =>
            r.players.length === 0 || r.players.some(p => p.scores.length < 18)
        );

        // 4b. If no round exists for today at all, auto-create one (Fastest Path)
        if (!activeRound && todaysRounds.length === 0) {
            const { createDefaultLiveRound } = await import('@/app/live/actions/create-live-round');
            const result = await createDefaultLiveRound(todayStr);
            if (result.success && result.roundId) {
                console.log('LOG-5: Auto-created new round for today:', result.roundId);
                return redirect(`/live?roundId=${result.roundId}`);
            }
        }

        // 4c. If all today's rounds are finished, or we still don't have one, fallback to latest
        if (!activeRound) {
            activeRound = await prisma.liveRound.findFirst({
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
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

    // 5. Redirect to ensure ID is in URL (Fastest path to join)
    if (!roundIdFromUrl && activeRound) {
        return redirect(`/live?roundId=${activeRound.id}`);
    }

    // 9. If activeRound has a specific courseId, use that as the defaultCourse
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
        where: {}, // Allow everyone to see past rounds
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, date: true, createdAt: true }
    });

    return (
        <LiveScoreClient
            allPlayers={(await prisma.player.findMany({
                where: {}, // Assuming archived doesn't exist in new schema or is not needed
                orderBy: { name: 'asc' },
                select: { id: true, name: true, handicapIndex: true, preferredTeeBox: true, email: true }
            })).map(p => ({ ...p, index: p.handicapIndex ?? 0 }))}
            defaultCourse={defaultCourse ? JSON.parse(JSON.stringify(defaultCourse)) : null}
            allCourses={JSON.parse(JSON.stringify(allCourses))}
            initialRound={activeRound ? JSON.parse(JSON.stringify(activeRound)) : null}
            todayStr={todayStr}
            allLiveRounds={allLiveRounds.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))}
            isAdmin={isAdmin}
        />
    );
}
