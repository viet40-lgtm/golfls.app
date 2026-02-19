'use server';
// build-trigger: 1.0.3

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
        const liveRound = await (prisma.liveRound as any).findUnique({
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
        let mainRound = await (prisma.round as any).findFirst({
            where: {
                date: liveRound.date,
                courseId: liveRound.courseId
            }
        });

        // Create main round if it doesn't exist
        if (!mainRound) {
            mainRound = await (prisma.round as any).create({
                data: {
                    date: liveRound.date,
                    courseId: liveRound.courseId,
                    courseName: liveRound.courseName || liveRound.course.name,
                    name: liveRound.name,
                    completed: true
                }
            });
        } else if (!mainRound.courseName) {
            // Update existing round if courseName is missing
            await (prisma.round as any).update({
                where: { id: mainRound.id },
                data: { courseName: liveRound.courseName || liveRound.course.name }
            });
        }

        let copiedCount = 0;
        let skippedCount = 0;

        // Copy/Update each selected player's data
        for (const livePlayer of selectedPlayers) {
            // Skip guest players (they don't have a playerId)
            if (livePlayer.isGuest || !livePlayer.playerId) {
                skippedCount++;
                continue;
            }

            // Check if this player already has scores in the main round
            const existingRoundPlayer = await (prisma.roundPlayer as any).findFirst({
                where: {
                    roundId: mainRound.id,
                    playerId: livePlayer.playerId
                }
            });

            let roundPlayer;
            if (existingRoundPlayer) {
                // UPDATE existing player
                roundPlayer = await (prisma.roundPlayer as any).update({
                    where: { id: existingRoundPlayer.id },
                    data: {
                        teeBoxId: livePlayer.teeBoxId,
                        teeBoxName: livePlayer.teeBoxName,
                        teeBoxPar: livePlayer.teeBoxPar,
                        teeBoxRating: livePlayer.teeBoxRating,
                        teeBoxSlope: livePlayer.teeBoxSlope,
                        courseHandicap: livePlayer.courseHandicap,
                        indexAtTime: livePlayer.indexAtTime,
                        grossScore: livePlayer.grossScore,
                        frontNine: livePlayer.frontNine,
                        backNine: livePlayer.backNine,
                        inPool: livePlayer.inPool
                    }
                });
                // Delete old scores for this player before re-adding
                await (prisma.score as any).deleteMany({
                    where: { roundPlayerId: roundPlayer.id }
                });
            } else {
                // CREATE new round player entry
                roundPlayer = await (prisma.roundPlayer as any).create({
                    data: {
                        roundId: mainRound.id,
                        playerId: livePlayer.playerId,
                        teeBoxId: livePlayer.teeBoxId,
                        teeBoxName: livePlayer.teeBoxName,
                        teeBoxPar: livePlayer.teeBoxPar,
                        teeBoxRating: livePlayer.teeBoxRating,
                        teeBoxSlope: livePlayer.teeBoxSlope,
                        courseHandicap: livePlayer.courseHandicap,
                        indexAtTime: livePlayer.indexAtTime,
                        grossScore: livePlayer.grossScore,
                        frontNine: livePlayer.frontNine,
                        backNine: livePlayer.backNine,
                        inPool: livePlayer.inPool
                    }
                });
            }

            // Copy all hole scores
            for (const liveScore of livePlayer.scores) {
                await (prisma.score as any).create({
                    data: {
                        roundPlayerId: roundPlayer.id,
                        holeId: liveScore.holeId,
                        strokes: liveScore.strokes
                    }
                });
            }

            copiedCount++;
        }

        // Recalculate handicaps after adding/updating scores
        if (copiedCount > 0) {
            console.log('Recalculating handicaps after copying live scores...');
            await recalculateAllHandicaps();
        }

        revalidatePath('/scores');
        revalidatePath('/players');
        revalidatePath('/pool');

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
