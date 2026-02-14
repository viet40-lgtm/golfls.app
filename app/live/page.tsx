import { prisma } from '@/lib/prisma';
import LiveScoreClient from './LiveScoreClient';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { cleanupStaleRounds } from '@/app/actions/cleanup-rounds';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata = {
    title: {
        absolute: "Golf Live Scores - GolfLS.app",
    },
};

// build-trigger: 2026-02-05-18:19

export default async function LiveScorePage(props: { searchParams: Promise<{ roundId?: string; hole?: string }> }) {
    // Resolve URL params
    const resolvedSearchParams = await props.searchParams;
    const roundIdFromUrl = resolvedSearchParams.roundId;
    const holeFromUrl = resolvedSearchParams.hole ? parseInt(resolvedSearchParams.hole) : 1;
    const gpsFromUrl = (resolvedSearchParams as any).gps;

    // Check if user is authenticated
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('auth_status')?.value === 'true';
    const sessionUserId = cookieStore.get('session_userId')?.value;

    if (!isAuthenticated || !sessionUserId) {
        redirect('/');
    }

    // Determine if GPS should be loaded (to avoid heavy hazard queries if OFF)
    const isGpsEnabled = gpsFromUrl !== undefined
        ? gpsFromUrl === 'true'
        : cookieStore.get('gps_enabled')?.value === 'true';

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

    // Helper for optimized hole fetching: All holes for Par/Scorecard, but Elements ONLY for active hole (and only if GPS is ON)
    const holeIncludeConfig = {
        orderBy: { holeNumber: 'asc' as const },
        include: isGpsEnabled ? {
            elements: {
                where: {
                    hole: {
                        holeNumber: holeFromUrl
                    }
                }
            }
        } : {}
    };

    // 1. IMPROVED FALLBACK LOGIC: Prioritize URL param, then Today, then Recent
    if (roundIdFromUrl) {
        // Load specific round from URL
        activeRound = await prisma.liveRound.findUnique({
            where: { id: roundIdFromUrl },
            include: {
                course: {
                    include: {
                        teeBoxes: true,
                        holes: holeIncludeConfig
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
            // Also try to find the player entry for this user to get the last used tee box
            const playerInRound = activeRound.players.find((p: any) => p.playerId === sessionUserId);
            if (playerInRound) {
                lastUsedTeeBoxId = playerInRound.teeBoxId;
            }
        }
    } else {
        // Only perform these queries if we don't have a roundId from the URL
        const roundsToday = await prisma.liveRoundPlayer.findMany({
            where: {
                playerId: sessionUserId,
                liveRound: {
                    date: todayStr
                }
            },
            orderBy: { liveRound: { createdAt: 'desc' } },
            include: {
                liveRound: {
                    include: {
                        course: {
                            include: {
                                teeBoxes: true,
                                holes: holeIncludeConfig
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

        if (roundsToday.length > 0) {
            // Use the most recent round from today
            activeRound = roundsToday[0].liveRound;
            defaultCourse = activeRound.course;
            lastUsedCourseId = activeRound.courseId;
            lastUsedTeeBoxId = roundsToday[0].teeBoxId;
        } else {
            // Failover: Try to find the user's most recent COMPLETE round (18 holes)
            const recentRoundPlayers = await prisma.liveRoundPlayer.findMany({
                where: { playerId: sessionUserId },
                orderBy: { liveRound: { date: 'desc' } },
                take: 10,
                include: {
                    scores: true,
                    liveRound: {
                        include: {
                            course: {
                                include: {
                                    teeBoxes: true,
                                    holes: holeIncludeConfig
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

            const completeRoundPlayer = recentRoundPlayers.find(rp => (rp.scores?.length || 0) >= 18);

            if (completeRoundPlayer) {
                activeRound = completeRoundPlayer.liveRound;
                defaultCourse = completeRoundPlayer.liveRound.course;
                lastUsedCourseId = completeRoundPlayer.liveRound.courseId;
                lastUsedTeeBoxId = completeRoundPlayer.teeBoxId;
            } else {
                // Absolute last round fallback
                const lastUserRoundPlayer = await prisma.liveRoundPlayer.findFirst({
                    where: { playerId: sessionUserId },
                    orderBy: { liveRound: { createdAt: 'desc' } },
                    include: {
                        liveRound: {
                            include: {
                                course: {
                                    include: {
                                        teeBoxes: true,
                                        holes: holeIncludeConfig
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

                if (lastUserRoundPlayer) {
                    activeRound = lastUserRoundPlayer.liveRound;
                    defaultCourse = lastUserRoundPlayer.liveRound.course;
                    lastUsedCourseId = lastUserRoundPlayer.liveRound.courseId;
                    lastUsedTeeBoxId = lastUserRoundPlayer.teeBoxId;
                }
            }
        }
    }

    // STEP 2: Get user's last 10 rounds (id + date + courseName for dropdown)
    const userRoundPlayers = await prisma.liveRoundPlayer.findMany({
        where: { playerId: sessionUserId },
        orderBy: { liveRound: { date: 'desc' } },
        take: 10,
        select: {
            liveRound: {
                select: { id: true, date: true, courseName: true }
            }
        }
    });

    // Extract unique rounds and format display name: "Sat-02/01-City Park North"
    const seenRoundIds = new Set();
    const allLiveRounds = userRoundPlayers
        .map(rp => rp.liveRound)
        .filter(r => {
            if (!r || seenRoundIds.has(r.id)) return false;
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
                email: rp.player.email,
                scorerId: rp.scorerId
            }));
    }

    // STEP 3: Optimized Course Fetch for Dropdowns (Names/IDs only)
    const availableCourses = await prisma.course.findMany({
        select: {
            id: true,
            name: true,
            teeBoxes: {
                select: { id: true, name: true, rating: true, slope: true, par: true }
            }
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
            allPlayers={JSON.parse(JSON.stringify(allPlayers))}
            defaultCourse={defaultCourse ? JSON.parse(JSON.stringify(defaultCourse)) : null}
            allCourses={JSON.parse(JSON.stringify(availableCourses))}
            initialRound={activeRound ? JSON.parse(JSON.stringify(activeRound)) : null}
            todayStr={todayStr}
            allLiveRounds={JSON.parse(JSON.stringify(allLiveRounds))}
            isAdmin={isAdmin}
            currentUserId={sessionUserId}
            currentUserName={currentPlayerProfile?.name || 'Player'}
            lastUsedCourseId={lastUsedCourseId}
            lastUsedTeeBoxId={lastUsedTeeBoxId}
        />
    );
}
