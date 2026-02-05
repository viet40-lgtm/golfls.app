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

export default async function LiveScorePage(props: { searchParams: Promise<{ roundId?: string }> }) {
    const resolvedSearchParams = await props.searchParams;
    const roundIdFromUrl = resolvedSearchParams.roundId;

    // Check if user is authenticated
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('auth_status')?.value === 'true';
    const sessionUserId = cookieStore.get('session_userId')?.value;

    if (!isAuthenticated || !sessionUserId) {
        redirect('/');
    }

    // Check if user is admin
    const isAdmin = cookieStore.get('admin_session')?.value === 'true';

    // Resolve Today's Date (Chicago)
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const todayStr = formatter.format(new Date());

    let activeRound: any = null;
    let defaultCourse: any = null;
    let lastUsedCourseId = null;
    let lastUsedTeeBoxId = null;

    // STEP 1: Find user's last round (with course + players included)
    if (roundIdFromUrl) {
        // Load specific round from URL
        activeRound = await prisma.liveRound.findUnique({
            where: { id: roundIdFromUrl },
            include: {
                course: {
                    include: {
                        teeBoxes: true,
                        holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } }
                    }
                },
                players: {
                    include: {
                        player: true,
                        scores: { include: { hole: true } }
                    }
                }
            }
        });
        if (activeRound?.course) {
            defaultCourse = activeRound.course;
            lastUsedCourseId = activeRound.courseId;
        }
    } else {
        // Find user's last rounds to pick the most recent one
        const userRPs = await prisma.liveRoundPlayer.findMany({
            where: { playerId: sessionUserId },
            include: {
                liveRound: {
                    include: {
                        course: {
                            include: {
                                holes: true
                            }
                        }
                    }
                },
                scores: true
            }
        });

        // CLEANUP: Delete incomplete past rounds (not today, scores < holes)
        const roundIdsToDelete: string[] = [];
        const validRPs = [];

        for (const rp of userRPs) {
            const roundDate = rp.liveRound?.date;
            const isToday = roundDate === todayStr;
            const holeCount = rp.liveRound?.course?.holes?.length || 18;
            const scoreCount = rp.scores?.length || 0;

            // Mark for deletion if:
            // 1. It's a past round (not today)
            // 2. It's incomplete (scores < holes)
            if (!isToday && scoreCount < holeCount) {
                if (rp.liveRoundId) {
                    roundIdsToDelete.push(rp.liveRoundId);
                }
            } else {
                validRPs.push(rp);
            }
        }

        if (roundIdsToDelete.length > 0) {
            // console.log('Deleting incomplete past rounds:', roundIdsToDelete);
            await prisma.liveRound.deleteMany({
                where: {
                    id: { in: roundIdsToDelete }
                }
            });
        }

        const sortedRPs = validRPs.sort((a, b) => {
            const dateA = a.liveRound?.date || '';
            const dateB = b.liveRound?.date || '';
            return dateB.localeCompare(dateA);
        });

        if (sortedRPs.length > 0) {
            // Re-fetch the FULL active round data since the initial lightweight fetch didn't include everything
            const lastUserRoundPlayer = sortedRPs[0];
            activeRound = await prisma.liveRound.findUnique({
                where: { id: lastUserRoundPlayer.liveRoundId },
                include: {
                    course: {
                        include: {
                            teeBoxes: true,
                            holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } }
                        }
                    },
                    players: {
                        include: {
                            player: true,
                            scores: { include: { hole: true } }
                        }
                    }
                }
            });

            if (activeRound?.course) {
                defaultCourse = activeRound.course;
                lastUsedCourseId = activeRound.courseId;
                lastUsedTeeBoxId = lastUserRoundPlayer.teeBoxId;
            }
        }
    }

    // AUTO-HEAL: Ensure active round has a shortId
    if (activeRound && !activeRound.shortId) {
        const newShortId = await ensureRoundHasShortId(activeRound.id);
        if (newShortId) {
            activeRound.shortId = newShortId;
        }
    }

    // STEP 2: Get rounds for dropdown (Admin: All recent; User: Their last 10)
    let rawRoundsForDropdown: any[] = [];

    if (isAdmin) {
        rawRoundsForDropdown = await prisma.liveRound.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    } else {
        const userRoundPlayers = await prisma.liveRoundPlayer.findMany({
            where: { playerId: sessionUserId },
            include: {
                liveRound: true
            }
        });

        const sortedRPs = userRoundPlayers.sort((a, b) => {
            const dateA = a.liveRound?.date || '';
            const dateB = b.liveRound?.date || '';
            return dateB.localeCompare(dateA);
        }).slice(0, 10);

        rawRoundsForDropdown = sortedRPs.map(rp => rp.liveRound).filter(r => r !== null);
    }

    const seenRoundIds = new Set();
    const allLiveRounds = rawRoundsForDropdown
        .filter(r => {
            if (!r || seenRoundIds.has(r.id)) return false;
            seenRoundIds.add(r.id);
            return true;
        })
        .map(r => {
            // Format date as "Sat-02/01"
            let dateStr = r.date;
            try {
                // Determine valid date string
                if (!dateStr) dateStr = new Date().toISOString().split('T')[0];
            } catch (e) {
                dateStr = new Date().toISOString().split('T')[0];
            }

            const date = new Date(dateStr + 'T12:00:00');
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            // Clean up course name (remove "New Orleans" if present) and slugify
            const rawName = r.courseName || 'Unknown Course';
            const courseName = rawName
                .replace(/New Orleans/gi, '')
                .trim()
                .toLowerCase()
                .replace(/\s+/g, '-');

            const displayName = `${dayName}-${month}-${day}-${courseName}`;
            return { id: r.id, name: displayName };
        });

    // Fetch ALL players for the selection modal
    const allDbPlayers = await prisma.player.findMany({
        orderBy: { name: 'asc' }
    });

    const allPlayers = allDbPlayers.map(p => ({
        id: p.id,
        name: p.name,
        index: p.handicapIndex ?? 0,
        handicapIndex: p.handicapIndex ?? 0,
        preferred_tee_box: p.preferredTeeBox,
        preferredTeeBox: p.preferredTeeBox,
        phone: p.phone,
        player_id: p.playerId,
        email: p.email
    }));

    // Fetch all courses for the "New Round" dropdown
    const availableCourses = await prisma.course.findMany({
        include: {
            teeBoxes: true,
            holes: { include: { elements: true }, orderBy: { holeNumber: 'asc' } }
        },
        orderBy: { name: 'asc' }
    });

    // Fetch current user's profile for welcome message
    const currentPlayerProfile = await prisma.player.findUnique({
        where: { id: sessionUserId },
        select: { name: true }
    });

    return (
        <LiveScoreClient
            allPlayers={allPlayers}
            defaultCourse={defaultCourse ? JSON.parse(JSON.stringify(defaultCourse)) : null}
            allCourses={JSON.parse(JSON.stringify(availableCourses))}
            initialRound={activeRound ? JSON.parse(JSON.stringify(activeRound)) : null}
            todayStr={todayStr}
            allLiveRounds={allLiveRounds}
            isAdmin={isAdmin}
            currentUserId={sessionUserId}
            currentUserName={currentPlayerProfile?.name || 'Player'}
            lastUsedCourseId={lastUsedCourseId}
            lastUsedTeeBoxId={lastUsedTeeBoxId}
        />
    );
}
