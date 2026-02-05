'use server'

import { prisma } from '../../lib/prisma'
import { getSession } from '../../lib/auth'

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
                                difficulty: true
                            }
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

        // Manual sort of holes
        if (round.course?.holes) {
            round.course.holes = [...round.course.holes].sort((a, b) => a.holeNumber - b.holeNumber);
        }

        return JSON.parse(JSON.stringify(round));
    } catch (e) {
        console.error("getLiveRoundData Server Action Error:", e);
        return null;
    }
}

export async function getInitialLivePageData(todayStr: string) {
    try {
        const session = await getSession();
        if (!session) return { error: "No session" };
        const sessionUserId = session.id;

        // 1. Fetch user's rounds
        const userRPs = await prisma.liveRoundPlayer.findMany({
            where: { playerId: sessionUserId },
            include: {
                liveRound: {
                    select: {
                        id: true,
                        date: true,
                        course: { select: { id: true } }
                    }
                }
            },
            take: 15
        });

        // Manual sort by date descending
        userRPs.sort((a, b) => (b.liveRound?.date || '').localeCompare(a.liveRound?.date || ''));

        const candidates = userRPs.filter(rp => !!rp.liveRound);
        const activeRP = candidates.find(rp => rp.liveRound.date === todayStr) || candidates[0];

        let activeRound = null;
        let lastUsedCourseId = null;
        let lastUsedTeeBoxId = null;

        if (activeRP) {
            activeRound = await getLiveRoundData(activeRP.liveRoundId);
            lastUsedCourseId = activeRound?.courseId;
            lastUsedTeeBoxId = activeRP.teeBoxId;
        }

        if (!lastUsedCourseId) {
            const lastLegacyRP = await prisma.roundPlayer.findFirst({
                where: { playerId: sessionUserId },
                orderBy: { round: { date: 'desc' } },
                select: { teeBoxId: true, round: { select: { courseId: true } } }
            });
            if (lastLegacyRP) {
                lastUsedCourseId = lastLegacyRP.round.courseId;
                lastUsedTeeBoxId = lastLegacyRP.teeBoxId;
            }
        }

        // 2. Discovery: Rounds from today OR user's history
        const rawRounds = await prisma.liveRound.findMany({
            where: {
                OR: [
                    { date: todayStr },
                    { players: { some: { playerId: sessionUserId } } }
                ]
            },
            take: 20,
            orderBy: { date: 'desc' },
            select: { id: true, name: true, date: true, courseName: true }
        });

        const allLiveRounds = rawRounds.map(r => {
            try {
                const datePart = r.date || todayStr;
                const dateObj = new Date(datePart + 'T12:00:00');
                const dayName = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const courseSlug = (r.courseName || 'round').replace(/New Orleans/gi, '').trim().toLowerCase().replace(/\s+/g, '-');
                const name = dayName ? `${dayName}-${month}-${day}-${courseSlug}` : (r.name || 'Round');
                return { id: r.id, name };
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
    } catch (e: any) {
        console.error("getInitialLivePageData Server Action Error:", e);
        return { error: String(e.message || e) };
    }
}
