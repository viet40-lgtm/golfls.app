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

    // 2. Resolve Today's Date (Chicago)
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const todayStr = formatter.format(new Date()); // Returns YYYY-MM-DD

    // --- CLEANUP: Delete unfinished rounds from previous days ---
    try {
        const oldRounds = await prisma.liveRound.findMany({
            where: { date: { lt: todayStr } },
            include: { players: { include: { scores: true } } }
        });

        for (const round of oldRounds) {
            // A round is unfinished if it has players and at least one player has < 18 scores
            const isUnfinished = round.players.length > 0 && round.players.some(p => p.scores.length < 18);
            if (isUnfinished) {
                console.log(`[Cleanup] Deleting unfinished old round: ${round.name} (${round.date})`);
                await prisma.liveRound.delete({ where: { id: round.id } });
            }
        }
    } catch (error) {
        console.error('[Cleanup] Failed to delete unfinished old rounds:', error);
    }
    // -----------------------------------------------------------

    let activeRound = null;

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

        // If non-admin user tries to access an old round, redirect to today's round
        // Check removed to allow non-admins to see old rounds
        if (activeRound && !isAdmin && activeRound.date !== todayStr) {
            // Allow access
        }

        if (activeRound) console.log('LOG-4: Loaded URL round:', activeRound.name);
    }

    // 4. Priority B: Load Latest Round (priority: today, then last Saturday, then any Saturday, then latest)
    if (!activeRound) {
        // Get recent rounds to check dates
        const recentRounds = await prisma.liveRound.findMany({
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            take: 20,
            select: { id: true, date: true }
        });

        if (recentRounds.length > 0) {
            // Selection Logic:
            // ALWAYS default to the absolute latest round (as per rules.md)
            const targetId = recentRounds[0]?.id;

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
                if (activeRound) console.log('LOG-4: Loaded target round:', activeRound.name, activeRound.date);
            }
        }
    }


    // 6. If still no round exists, redirect to home
    // 6. If still no round exists, proceed with null activeRound
    if (!activeRound) {
        console.log('LOG-13: No rounds exist. Rendering empty state.');
    }

    // 7. Final safety check: Non-admin users should only see today's round
    // Safety check removed so non-admins can view old rounds
    if (!isAdmin && activeRound && activeRound.date !== todayStr) {
        // Allow access
    }

    // 8. Redirect to ensure ID is in URL
    if (!roundIdFromUrl && activeRound) {
        return redirect(`/live?roundId=${activeRound.id}`);
    }

    // 9. If activeRound has a specific course_id, use that as the defaultCourse
    if (activeRound?.courseId) {
        const roundCourse = await prisma.course.findUnique({
            where: { id: (activeRound as any).courseId },
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
            allPlayers={await (prisma.player as any).findMany({
                where: {},
                orderBy: { name: 'asc' },
                select: { id: true, name: true, handicapIndex: true, preferredTeeBox: true, email: true }
            })}
            defaultCourse={defaultCourse ? JSON.parse(JSON.stringify(defaultCourse)) : null}
            allCourses={JSON.parse(JSON.stringify(allCourses))}
            initialRound={activeRound ? JSON.parse(JSON.stringify(activeRound)) : null}
            todayStr={todayStr}
            allLiveRounds={allLiveRounds.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))}
            isAdmin={isAdmin}
        />
    );
}
