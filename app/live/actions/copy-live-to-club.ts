'use server';
// build-trigger: 1.0.3

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recalculateAllHandicaps } from '../../actions/recalculate-handicaps';
import { recalculatePayouts } from '../../actions/recalculate-payouts';

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
                    courseName: liveRound.courseName || liveRound.course.name,
                    name: liveRound.name
                }
            });
        } else if (!mainRound.courseName) {
            // Update existing round if course_name is missing
            await prisma.round.update({
                where: { id: mainRound.id },
                data: { courseName: liveRound.courseName || liveRound.course.name }
            });
        }

        let copiedCount = 0;
        let skippedCount = 0;

        // Copy/Update each selected player's data
        for (const livePlayer of selectedPlayers) {
            // Skip guest players (they don't have a player_id)
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

            let roundPlayer;
            if (existingRoundPlayer) {
                // UPDATE existing player
                roundPlayer = await prisma.roundPlayer.update({
                    where: { id: existingRoundPlayer.id },
                    data: {
                        teeBoxId: livePlayer.teeBoxId ?? '',
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
            } else {
                // CREATE new round player entry
                roundPlayer = await prisma.roundPlayer.create({
                    data: {
                        roundId: mainRound.id,
                        playerId: livePlayer.playerId,
                        teeBoxId: livePlayer.teeBoxId ?? '',
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

        // 5. Transfer Skins (MoneyEvents) for selected players
        const playerIdsToClean = selectedPlayers.map(p => p.playerId).filter((id): id is string => !!id);
        if (playerIdsToClean.length > 0) {
            // Remove existing to avoid duplicates on re-transfer
            await prisma.moneyEvent.deleteMany({
                where: {
                    roundId: mainRound.id,
                    playerId: { in: playerIdsToClean },
                    eventType: { startsWith: 'SKINS_ENTRY' }
                }
            });

            // Fetch from live round
            const liveSkins = await prisma.moneyEvent.findMany({
                where: {
                    roundId: liveRound.id,
                    playerId: { in: playerIdsToClean },
                    eventType: { startsWith: 'SKINS_ENTRY' }
                }
            });

            // Clone to main round
            if (liveSkins.length > 0) {
                const clones = liveSkins.map(e => ({
                    roundId: mainRound!.id,
                    playerId: e.playerId,
                    eventType: e.eventType,
                    amount: e.amount,
                    holeNumber: e.holeNumber
                }));
                await prisma.moneyEvent.createMany({ data: clones });
            }
        }

        // Recalculate handicaps after adding/updating scores
        if (copiedCount > 0) {
            console.log('Recalculating handicaps after copying live scores...');
            await recalculateAllHandicaps();
            console.log('Recalculating payouts after copying live scores...');
            await recalculatePayouts();
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
