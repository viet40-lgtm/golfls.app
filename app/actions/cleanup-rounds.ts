'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Automatically cleans up stale, incomplete live rounds for a user.
 * A round is considered stale if its date is before today (Central Time).
 * A round is considered incomplete if the player has fewer than 18 scores.
 */
export async function cleanupStaleRounds(userId: string) {
    if (!userId) return { success: false, error: 'User ID is required' };

    try {
        // 1. Resolve Today's Date (Chicago)
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Chicago',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const todayStr = formatter.format(new Date());

        console.log(`🧹 Running stale round cleanup for user ${userId}. Today is ${todayStr}`);

        // 2. Find live rounds where this user participated that are from a previous date
        const userLiveRounds = await prisma.liveRoundPlayer.findMany({
            where: {
                playerId: userId,
                liveRound: {
                    date: {
                        lt: todayStr
                    }
                }
            },
            include: {
                liveRound: true,
                scores: true
            }
        });

        if (userLiveRounds.length === 0) {
            return { success: true, message: 'No stale rounds found for this user.' };
        }

        let deletedCount = 0;

        for (const playerRound of userLiveRounds) {
            const scoreCount = playerRound.scores.length;
            const liveRoundId = playerRound.liveRoundId;

            // Definition of "incomplete": Fewer than 18 scores
            if (scoreCount < 18) {
                console.log(`🚩 Stale incomplete round found: ${playerRound.liveRound.name} (${playerRound.liveRound.date}). Score count: ${scoreCount}. Deleting...`);

                try {
                    await prisma.liveRound.delete({
                        where: { id: liveRoundId }
                    });
                    deletedCount++;
                } catch (delError) {
                    // It might have been deleted already by a parallel request or another player's cleanup
                    console.log(`⚠️ Could not delete round ${liveRoundId}, possibly already deleted.`);
                }
            } else {
                console.log(`ℹ️ Stale round ${playerRound.liveRound.name} is complete (18 holes). Skipping auto-delete.`);
            }
        }

        if (deletedCount > 0) {
            revalidatePath('/');
            revalidatePath('/live');
        }

        return {
            success: true,
            message: `Cleanup complete. Deleted ${deletedCount} stale incomplete round(s).`
        };

    } catch (error) {
        console.error('Failed to cleanup stale rounds:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to cleanup stale rounds'
        };
    }
}
