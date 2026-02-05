'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function getLiveRoundData(roundId: string) {
    if (!roundId) return null;
    try {
        const round = await prisma.liveRound.findUnique({
            where: { id: roundId },
            select: {
                id: true,
                name: true,
                date: true,
                shortId: true,
                par: true,
                rating: true,
                slope: true,
                courseId: true,
                courseName: true,
                course: {
                    select: {
                        id: true,
                        name: true,
                        teeBoxes: {
                            select: {
                                id: true,
                                name: true,
                                rating: true,
                                slope: true,
                                par: true
                            }
                        },
                        holes: {
                            select: {
                                holeNumber: true,
                                par: true,
                                difficulty: true,
                                latitude: true,
                                longitude: true
                            },
                            orderBy: { holeNumber: 'asc' }
                        }
                    }
                },
                players: {
                    select: {
                        id: true,
                        guestName: true,
                        isGuest: true,
                        indexAtTime: true,
                        teeBoxName: true,
                        courseHandicap: true,
                        scorerId: true,
                        player: {
                            select: {
                                id: true,
                                name: true,
                                handicapIndex: true,
                                preferredTeeBox: true
                            }
                        },
                        scores: {
                            select: {
                                strokes: true,
                                hole: { select: { holeNumber: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!round) return null;
        return JSON.parse(JSON.stringify(round));
    } catch (e) {
        console.error("getLiveRoundData failed:", e);
        return null;
    }
}

export async function getInitialLivePageData(todayStr: string) {
    try {
        const session = await getSession();
        if (!session) return { error: "No session" };
        const sessionUserId = session.id;

        // 1. Fetch user's rounds to find active/recent state
        const userRPs = await prisma.liveRoundPlayer.findMany({
            where: { playerId: sessionUserId },
            include: {
                liveRound: {
                    select: {
                        id: true,
                        date: true,
                        course: {
                            select: {
                                id: true,
                                holes: { select: { holeNumber: true } }
                            }
                        }
                    }
                },
                scores: { select: { hole: { select: { holeNumber: true } } } }
            },
            take: 20
        });

        // Manual sort by date descending (to avoid Prisma orderBy relation issues)
        userRPs.sort((a, b) => (b.liveRound?.date || '').localeCompare(a.liveRound?.date || ''));

        // Identify active or most recent round
        const candidates = userRPs.filter(rp => !!rp.liveRound);
        const activeRP = candidates.find(rp => rp.liveRound.date === todayStr) || candidates[0];

        let activeRound = null;
        let lastUsedCourseId = null;
        let lastUsedTeeBoxId = null;

        if (activeRP) {
            activeRound = await getLiveRoundData(activeRP.liveRoundId);
            lastUsedCourseId = activeRound?.courseId || activeRP.liveRound.course?.id;
            lastUsedTeeBoxId = activeRP.teeBoxId;
        }

        // if no active round found in LiveRounds, try legacy history for course/tee defaults
        if (!lastUsedCourseId) {
            try {
                const lastLegacyRP = await prisma.roundPlayer.findFirst({
                    where: { playerId: sessionUserId },
                    orderBy: { round: { date: 'desc' } },
                    select: { teeBoxId: true, round: { select: { courseId: true } } }
                });
                if (lastLegacyRP) {
                    lastUsedCourseId = lastLegacyRP.round.courseId;
                    lastUsedTeeBoxId = lastLegacyRP.teeBoxId;
                }
            } catch (e) {
                console.error("Legacy lookup fallback failed:", e);
            }
        }

        // 2. Dropdown Rounds Logic: Show Today's rounds (Discovery) OR User's History (Archive)
        const rawRounds = await prisma.liveRound.findMany({
            where: {
                OR: [
                    { date: todayStr },
                    { players: { some: { playerId: sessionUserId } } }
                ]
            },
            take: 40,
            orderBy: { date: 'desc' },
            select: { id: true, name: true, date: true, courseName: true }
        });

        const allLiveRounds = rawRounds.map(r => {
            try {
                const datePart = r.date || todayStr;
                const date = new Date(datePart + 'T12:00:00');
                const dayName = isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { weekday: 'short' });
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const courseSlug = (r.courseName || 'round').replace(/New Orleans/gi, '').trim().toLowerCase().replace(/\s+/g, '-');
                const name = dayName ? `${dayName}-${month}-${day}-${courseSlug}` : (r.name || 'Round');
                return { id: r.id, name };
            } catch (e) {
                return { id: r.id, name: r.name || 'Round' };
            }
        });

        // CRITICAL: Ensure absolute serialization for Server Action return
        return JSON.parse(JSON.stringify({
            activeRound,
            allLiveRounds,
            lastUsedCourseId,
            lastUsedTeeBoxId
        }));
    } catch (e: any) {
        console.error("getInitialLivePageData failed:", e);
        return { error: String(e.message || e) };
    }
}
