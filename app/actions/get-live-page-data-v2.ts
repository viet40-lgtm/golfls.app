'use server'

// V2 Actions to break cache
export async function getLiveRoundDataV2(roundId: string) {
    console.log("DIAG: getLiveRoundDataV2", roundId);
    return null;
}

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function getInitialLivePageDataV2(todayStr: string) {
    console.log("SERVER ACTION: getInitialLivePageDataV2", todayStr);

    try {
        const session = await getSession();

        // 1. Get all live rounds for the dropdown (limit 20 for perf)
        const allLiveRounds = await prisma.liveRound.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { id: true, name: true, date: true }
        });

        // 2. If user is logged in, attempt to find their active round for today
        let activeRound = null;
        let lastUsedCourseId = null;
        let lastUsedTeeBoxId = null;

        if (session && session.email) {
            // Find a round created today where this user is a player
            // Simplified logic: Just find ANY round for today they are part of
            // We might want to refine "Active" later
            const userRoundPlayer = await prisma.liveRoundPlayer.findFirst({
                where: {
                    player: { email: session.email },
                    liveRound: { date: todayStr }
                },
                include: {
                    liveRound: {
                        include: {
                            course: { include: { teeBoxes: true, holes: true } },
                            players: true,
                            // scores: true -- scores are usually on LiveScore table, linked to LiveRoundPlayer? 
                            // Or if LiveRound has scores relation:
                        }
                    }
                }
            });

            if (userRoundPlayer) {
                activeRound = userRoundPlayer.liveRound;
            }

            // Get last used settings from player profile
            const player = await prisma.player.findUnique({
                where: { email: session.email },
                select: { id: true }
            });
            // We don't verify lastUsedCourseId on player yet, assume null for now to save a query
            // or just rely on the frontend to cache it.
        }

        console.log(`SERVER ACTION: getInitialLivePageDataV2 Success. Active: ${activeRound?.id}, All: ${allLiveRounds.length}`);


        // CRITICAL FIX: Sanitize the return value to ensure it is generic JSON.
        // Prisma objects may contain Dates, Decimals, or other non-serializable types.
        const result = {
            activeRound,
            allLiveRounds,
            lastUsedCourseId,
            lastUsedTeeBoxId
        };

        return JSON.parse(JSON.stringify(result));

    } catch (error: any) {
        console.error("SERVER ACTION ERROR: getInitialLivePageDataV2", error);
        // Return structured error so UI can handle it gracefully instead of 500
        return {
            activeRound: null,
            allLiveRounds: [],
            lastUsedCourseId: null,
            lastUsedTeeBoxId: null,
            error: error.message
        };
    }
}
