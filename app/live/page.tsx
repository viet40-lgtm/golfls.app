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
        // Find user's last round
        // Find user's last rounds to pick the most recent one
        const userRPs = await prisma.liveRoundPlayer.findMany({
            where: { playerId: sessionUserId },
            include: {
                liveRound: {
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
                }
            }
        });

        const sortedRPs = userRPs.sort((a, b) => {
            const dateA = a.liveRound?.date || '';
            const dateB = b.liveRound?.date || '';
            return dateB.localeCompare(dateA);
        });

        if (sortedRPs.length > 0) {
            const lastUserRoundPlayer = sortedRPs[0];
            activeRound = lastUserRoundPlayer.liveRound;
            defaultCourse = lastUserRoundPlayer.liveRound.course;
            lastUsedCourseId = lastUserRoundPlayer.liveRound.courseId;
            lastUsedTeeBoxId = lastUserRoundPlayer.teeBoxId;
        }
    }

    // STEP 2: Get user's last 10 rounds for dropdown (re-using sortedRPs if possible)
    const userRoundPlayers = await prisma.liveRoundPlayer.findMany({
        where: { playerId: sessionUserId },
        include: {
            liveRound: true
        }
    });

    const sortedForDropdown = userRoundPlayers.sort((a, b) => {
        const dateA = a.liveRound?.date || '';
        const dateB = b.liveRound?.date || '';
        return dateB.localeCompare(dateA);
    }).slice(0, 10);

    const seenRoundIds = new Set();
    const allLiveRounds = sortedForDropdown.map(rp => rp.liveRound)
        .filter(r => {
            if (seenRoundIds.has(r.id)) return false;
            seenRoundIds.add(r.id);
            return true;
        })
        .map(r => {
            // Format date as "Sat-02/01"
            const date = new Date(r.date + 'T12:00:00');
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            // Clean up course name (remove "New Orleans" if present)
            const courseName = r.courseName.replace(/New Orleans/gi, '').trim();
            const displayName = `${dayName}-${month}/${day}-${courseName}`;
            return { id: r.id, name: displayName };
        });

    // Extract players from the round itself
    let allPlayers: any[] = [];
    if (activeRound?.players) {
        allPlayers = activeRound.players
            .filter((rp: any) => rp.player)
            .map((rp: any) => ({
                id: rp.player.id,
                name: rp.player.name,
                index: rp.player.handicapIndex,
                handicapIndex: rp.player.handicapIndex,
                preferred_tee_box: rp.player.preferredTeeBox,
                preferredTeeBox: rp.player.preferredTeeBox,
                email: rp.player.email
            }));
    }

    // Fetch current user's profile for welcome message
    const currentPlayerProfile = await prisma.player.findUnique({
        where: { id: sessionUserId },
        select: { name: true }
    });

    return (
        <LiveScoreClient
            allPlayers={allPlayers}
            defaultCourse={defaultCourse ? JSON.parse(JSON.stringify(defaultCourse)) : null}
            allCourses={[]}
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
