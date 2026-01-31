'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * LIVE SCORING ISOLATION
 * ======================
 * LEGACY ACTION - Most logic moved to create-live-round.ts
 * This file is kept and updated to maintain build compatibility.
 */

export async function saveLiveHoleScores(
    roundId: string,
    holeNumber: number,
    playerScores: Array<{ playerId: string; strokes: number }>
) {
    try {
        const round = await prisma.round.findUnique({
            where: { id: roundId },
            include: {
                course: {
                    include: {
                        holes: true,
                        teeBoxes: true
                    }
                }
            }
        });

        if (!round) throw new Error('Round not found');

        const hole = round.course.holes.find(h => h.holeNumber === holeNumber);
        if (!hole) throw new Error(`Hole ${holeNumber} not found for this course`);

        for (const ps of playerScores) {
            let roundPlayer = await prisma.roundPlayer.findFirst({
                where: {
                    roundId: roundId,
                    playerId: ps.playerId
                }
            });

            if (!roundPlayer) {
                const player = await prisma.player.findUnique({ where: { id: ps.playerId } });
                const playerTeeBoxName = player?.preferredTeeBox || 'White';
                const teeBox = round.course.teeBoxes.find(t => t.name.toLowerCase() === playerTeeBoxName.toLowerCase()) ||
                    round.course.teeBoxes.find(t => t.name === 'White') ||
                    round.course.teeBoxes[0];

                const handicapIndex = player?.handicapIndex || 0;
                const courseHandicap = Math.round(handicapIndex * (teeBox.slope / 113));

                roundPlayer = await prisma.roundPlayer.create({
                    data: {
                        roundId: roundId,
                        playerId: ps.playerId,
                        teeBoxId: teeBox.id,
                        name: player?.name || 'Unknown',
                        grossScore: null,
                        courseHandicap: courseHandicap,
                    }
                });
            }

            // Save the hole score
            const existingScore = await prisma.score.findFirst({
                where: {
                    roundPlayerId: roundPlayer.id,
                    holeId: hole.id
                }
            });

            if (existingScore) {
                await prisma.score.update({
                    where: { id: existingScore.id },
                    data: { strokes: ps.strokes }
                });
            } else {
                await prisma.score.create({
                    data: {
                        roundPlayerId: roundPlayer.id,
                        holeId: hole.id,
                        strokes: ps.strokes
                    }
                });
            }

            // Recalculate totals
            const allScores = await prisma.score.findMany({
                where: { roundPlayerId: roundPlayer.id },
                include: { hole: { select: { holeNumber: true } } }
            });

            let gross = 0;
            let front = 0;
            let back = 0;

            allScores.forEach(s => {
                gross += s.strokes;
                if (s.hole.holeNumber <= 9) front += s.strokes;
                else back += s.strokes;
            });

            await prisma.roundPlayer.update({
                where: { id: roundPlayer.id },
                data: {
                    grossScore: gross,
                    frontNine: front > 0 ? front : null,
                    backNine: back > 0 ? back : null
                }
            });
        }

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to save live scores:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save scores'
        };
    }
}
