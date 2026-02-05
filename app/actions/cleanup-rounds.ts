'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/**
 * Deletes incomplete rounds that are older than today.
 * Rule: date != today AND (scores count < hole count)
 */
export async function cleanupIncompleteRounds(todayStr: string) {
    try {
        const session = await getSession();
        if (!session) return { success: false, error: "No session" };
        const sessionUserId = session.id;

        // 1. Find the user's live rounds
        const userLiveRounds = await prisma.liveRound.findMany({
            where: {
                players: { some: { playerId: sessionUserId } }
            },
            include: {
                course: { select: { holes: { select: { id: true } } } },
                players: {
                    where: { playerId: sessionUserId },
                    include: { scores: true }
                }
            }
        });

        const roundsToDelete: string[] = [];

        for (const round of userLiveRounds) {
            // Only cleanup if it's NOT today
            if (round.date === todayStr) continue;

            const myRP = round.players[0];
            if (!myRP) continue;

            const holeCount = round.course?.holes?.length || 18;
            const scoreCount = myRP.scores?.length || 0;

            // Definition of "incomplete": fewer scores than holes
            if (scoreCount < holeCount) {
                roundsToDelete.push(round.id);
            }
        }

        if (roundsToDelete.length > 0) {
            console.log(`[Cleanup] Deleting ${roundsToDelete.length} incomplete past rounds:`, roundsToDelete);

            // Prisma will handle cascading deletes if schema is configured
            await prisma.liveRound.deleteMany({
                where: {
                    id: { in: roundsToDelete }
                }
            });

            return { success: true, count: roundsToDelete.length };
        }

        return { success: true, count: 0 };
    } catch (e) {
        console.error("Cleanup failed:", e);
        return { success: false, error: String(e) };
    }
}
