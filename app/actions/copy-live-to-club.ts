'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recalculateAllHandicaps } from './recalculate-handicaps';

/**
 * Copies selected players' scores from a live round to the main club scores
 */
export async function copyLiveToClub(data: {
    liveRoundId: string;
    playerIds: string[]; // Array of LiveRoundPlayer IDs
}) {
    try {
        // Get the live round with all its data
        const liveRound = await prisma.liveRound.findUnique({
            where: { id: data.liveRoundId },
            include: {
                course: {
                    include: {
                        holes: true
                    }
                },
                players: {
                    include: {
                        player: true,
                        teeBox: true,
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
            return { success: false, error: 'Live round not found' };
        }

        // Filter to only selected players
        const selectedPlayers = liveRound.players.filter(p => data.playerIds.includes(p.id));

        if (selectedPlayers.length === 0) {
            return { success: false, error: 'No players selected' };
        }

        // Check if a round already exists for this date and course
        let mainRound = await prisma.round.findFirst({
            where: {
                date: liveRound.date,
                courseId: liveRound.courseId
            }
        });

        // Create main round if it doesn't exist
        if (!mainRound) {
            mainRound = await prisma.round.create({
                data: {
                    date: liveRound.date,
                    courseId: liveRound.courseId,
                    courseName: liveRound.courseName,
                    name: liveRound.name,
                    isTournament: false
                }
            });
        }

        let copiedCount = 0;
        let skippedCount = 0;

        // Copy each selected player's data
        for (const livePlayer of selectedPlayers) {
            // Skip guest players (they don't have a playerId)
            if (livePlayer.isGuest || !livePlayer.playerId) {
                skippedCount++;
                continue;
            }

            // Check if this player already has scores in the main round
            const existingRoundPlayer = await prisma.roundPlayer.findFirst({
                where: {
                    roundId: mainRound.id,
                    playerId: livePlayer.playerId
                }
            });

            if (existingRoundPlayer) {
                skippedCount++;
                continue; // Skip if already exists
            }

            // Calculate net score if gross score is present
            const netScore = livePlayer.grossScore !== null
                ? livePlayer.grossScore - livePlayer.courseHandicap
                : null;

            // Create the main round player entry
            const roundPlayer = await prisma.roundPlayer.create({
                data: {
                    roundId: mainRound.id,
                    playerId: livePlayer.playerId,
                    teeBoxId: livePlayer.teeBoxId,
                    courseHandicap: livePlayer.courseHandicap,
                    grossScore: livePlayer.grossScore,
                    netScore: netScore,
                    frontNine: livePlayer.frontNine,
                    backNine: livePlayer.backNine
                }
            });

            // Copy all hole scores
            for (const liveScore of livePlayer.scores) {
                await prisma.score.create({
                    data: {
                        roundPlayerId: roundPlayer.id,
                        holeId: liveScore.holeId,
                        strokes: liveScore.strokes
                    }
                });
            }

            copiedCount++;
        }

        // Recalculate handicaps after adding new scores
        if (copiedCount > 0) {
            console.log('Recalculating handicaps after copying live scores...');
            await recalculateAllHandicaps();
        }

        revalidatePath('/scores');
        revalidatePath('/players');

        return {
            success: true,
            copiedCount,
            skippedCount,
            message: `Copied ${copiedCount} player(s) to club scores. ${skippedCount > 0 ? `Skipped ${skippedCount} (guests or duplicates).` : ''}${copiedCount > 0 ? ' Handicaps recalculated.' : ''}`
        };
    } catch (error) {
        console.error('Failed to copy live scores to club:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to copy scores'
        };
    }
}
