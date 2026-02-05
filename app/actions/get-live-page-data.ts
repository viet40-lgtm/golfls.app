'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function getLiveRoundData(roundId: string) {
    try {
        const round = await prisma.liveRound.findUnique({
            where: { id: roundId },
            include: {
                course: {
                    include: {
                        teeBoxes: true,
                        holes: { orderBy: { holeNumber: 'asc' } } // Exclude elements to save payload
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
        if (!session) return null;
        const sessionUserId = session.id;

        // Try to find last round
        const userRPs = await prisma.liveRoundPlayer.findMany({
            where: { playerId: sessionUserId },
            include: {
                liveRound: {
                    include: {
                        course: { include: { holes: true, teeBoxes: true } }
                    }
                },
                scores: true
            },
            take: 10
        });

        const validRPs = userRPs.filter(rp => {
            const roundDate = rp.liveRound?.date;
            const isToday = roundDate === todayStr;
            const holeCount = rp.liveRound?.course?.holes?.length || 18;
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

        // Dropdown Rounds
        const rawRounds = await prisma.liveRound.findMany({
            where: {
                players: { some: { playerId: sessionUserId } }
            },
            take: 20,
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
                return { id: r.id, name: r.name };
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
        return null;
    }
}
