'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recalculateAllHandicaps } from './recalculate-handicaps';

/**
 * Completes a live round by copying it to the main Round table and deleting from LiveRound
 */
export async function completeLiveRound(liveRoundId: string) {
    try {
        console.log(`🏁 Completing live round ${liveRoundId}...`);

        // 1. Get the live round with all data
        const liveRound = await prisma.liveRound.findUnique({
            where: { id: liveRoundId },
            include: {
                players: {
                    include: {
                        scores: {
                            include: {
                                hole: true
                            }
                        }
                    }
                }
            }
        });

        if (!liveRound) {
            throw new Error('Live round not found');
        }

        // 2. Create a new Round in the main table
        // 2. Create a new Round in the main table
        const newRound = await prisma.round.create({
            data: {
                date: liveRound.date,
                name: liveRound.name,
                courseId: liveRound.courseId,
                courseName: liveRound.courseName,
                isTournament: false
            }
        });

        // 3. Copy all players and their scores (excluding guests)
        for (const livePlayer of liveRound.players) {
            // Skip guest players as they don't have a permanent profile history
            if (livePlayer.isGuest || !livePlayer.playerId) {
                continue;
            }

            // Create RoundPlayer
            const roundPlayer = await prisma.roundPlayer.create({
                data: {
                    roundId: newRound.id,
                    playerId: livePlayer.playerId,
                    teeBoxId: livePlayer.teeBoxId,
                    // Remove non-existent fields if they are not in schema (checked previously)
                    // Checking schema: RoundPlayer has grossScore, courseHandicap, frontNine, backNine
                    // It does NOT have teeBoxName, teeBoxRating, etc.
                    courseHandicap: livePlayer.courseHandicap,
                    grossScore: livePlayer.grossScore,
                    frontNine: livePlayer.frontNine,
                    backNine: livePlayer.backNine
                }
            });

            // Copy all scores
            for (const liveScore of livePlayer.scores) {
                await prisma.score.create({
                    data: {
                        roundPlayerId: roundPlayer.id,
                        holeId: liveScore.holeId,
                        strokes: liveScore.strokes
                    }
                });
            }
        }

        // 4. Delete the live round (cascade will delete players and scores)
        await prisma.liveRound.delete({
            where: { id: liveRoundId }
        });

        // 5. Recalculate handicaps now that we have a new completed round
        await recalculateAllHandicaps();

        // 6. Revalidate pages
        revalidatePath('/');
        revalidatePath('/scores');
        revalidatePath('/players');

        console.log(`✅ Live round completed and moved to main rounds table.`);
        return { success: true, roundId: newRound.id };
    } catch (error) {
        console.error('Failed to complete live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to complete round'
        };
    }
}
