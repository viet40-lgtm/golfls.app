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

        // Try to find the user's recent rounds to find the active one
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
                                holes: { select: { id: true, holeNumber: true } }
                            }
                        }
                    }
                },
                scores: { select: { id: true } }
            },
            take: 5
        });

        const validRPs = userRPs.filter(rp => {
            if (!rp.liveRound) return false;
            const roundDate = rp.liveRound.date;
            const isToday = roundDate === todayStr;
            const holeCount = rp.liveRound.course?.holes?.length || 18;
            const scoreCount = rp.scores?.length || 0;
            return isToday || scoreCount >= holeCount;
        });

        const sortedRPs = validRPs.sort((a, b) => {
            const dateA = a.liveRound?.date || '';
            const dateB = b.liveRound?.date || '';
            return dateB.localeCompare(dateA);
        });

        let activeRound = null;
        let lastUsedCourseId = null;
        let lastUsedTeeBoxId = null;

        if (sortedRPs.length > 0) {
            const lastRP = sortedRPs[0];
            activeRound = await getLiveRoundData(lastRP.liveRoundId);
            lastUsedCourseId = activeRound?.courseId;
            lastUsedTeeBoxId = lastRP.teeBoxId;
        }

        // if no active round found in LiveRounds, try to at least find last used course/tee from legacy rounds
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
                console.error("Legacy round lookup failed:", e);
            }
        }

        // Dropdown Rounds - only select what we need
        const rawRounds = await prisma.liveRound.findMany({
            where: {
                players: { some: { playerId: sessionUserId } }
            },
            take: 15,
            orderBy: { date: 'desc' },
            select: { id: true, name: true, date: true, courseName: true }
        });

        const allLiveRounds = rawRounds.map(r => {
            try {
                const date = new Date((r.date || new Date().toISOString().split('T')[0]) + 'T12:00:00');
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const courseSlug = (r.courseName || 'round').replace(/New Orleans/gi, '').trim().toLowerCase().replace(/\s+/g, '-');
                return { id: r.id, name: `${dayName}-${month}-${day}-${courseSlug}` };
            } catch (e) {
                return { id: r.id, name: r.name || 'Round' };
            }
        });

        return JSON.parse(JSON.stringify({
            activeRound,
            allLiveRounds,
            lastUsedCourseId,
            lastUsedTeeBoxId
        }));
    } catch (e) {
        console.error("getInitialLivePageData failed:", e);
        return { error: "Failed to fetch initial page data" };
    }
}
