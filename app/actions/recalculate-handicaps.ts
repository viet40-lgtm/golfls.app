'use server';

import { prisma } from '@/lib/prisma';
import { calculateHandicap, HandicapInput } from '@/lib/handicap';
import { revalidatePath } from 'next/cache';

export async function recalculateAllHandicaps() {
    try {
        console.log('🚀 Starting Simplified Handicap Recalculation...');

        // 1. Fetch all players
        const players = await prisma.player.findMany({
            include: {
                rounds: {
                    include: {
                        round: true,
                        teeBox: true
                    }
                }
            }
        });

        let updatedCount = 0;

        for (const player of players) {
            try {
                // 2. Sort Rounds Chronologically
                // Filter out rounds with no score or no tee box
                const validRounds = player.rounds
                    .filter((rp: any) => (rp.grossScore || rp.adjustedGrossScore) && (rp.teeBoxId || rp.teeBox))
                    .map((rp: any) => ({
                        id: rp.id,
                        date: rp.round.date,
                        score: rp.grossScore || 0, // Fallback to gross if adjusted not computed?
                        rating: rp.teeBox?.rating || 0,
                        slope: rp.teeBox?.slope || 113,
                        timestamp: new Date(rp.round.date).getTime()
                    }))
                    .sort((a: any, b: any) => a.timestamp - b.timestamp);

                const currentHistory: HandicapInput[] = [];

                for (const round of validRounds) {
                    // A. Calculate Index BEFORE this round
                    // Note: This simplified version does not use dynamic Low Index (Soft/Hard cap) 
                    // because we lack history and schema support for it.
                    const statsBefore = calculateHandicap(currentHistory, null);
                    const indexBefore = statsBefore.handicapIndex;

                    // B. Add this round to history
                    currentHistory.push({
                        id: round.id,
                        date: round.date,
                        score: round.score,
                        rating: round.rating,
                        slope: round.slope
                    } as HandicapInput);

                    // C. Update DB RoundPlayer indexAtTime
                    // Only update if it changed? Or just blind update.
                    await prisma.roundPlayer.update({
                        where: { id: round.id },
                        data: {
                            indexAtTime: indexBefore
                        }
                    });
                    updatedCount++;
                }

                // 3. Update Final Player Index
                const finalStats = calculateHandicap(currentHistory, null);
                await prisma.player.update({
                    where: { id: player.id },
                    data: {
                        handicapIndex: finalStats.handicapIndex
                    }
                });

            } catch (error) {
                console.error(`failed to process player ${player.name}:`, error);
            }
        }

        console.log(`✅ Recalculation Complete. Updated rounds for ${players.length} players.`);
        revalidatePath('/scores');
        revalidatePath('/players');
        return { success: true, message: `Recalculated handicaps for ${players.length} players with current schema.` };

    } catch (error) {
        console.error('Recalculation failed:', error);
        return { success: false, message: 'Failed to recalculate handicaps.' };
    }
}

// Helper
function convertToHandicapInput(history: any[]): HandicapInput[] {
    return history.map(h => {
        if (h.differential !== undefined) {
            return { id: h.id, date: h.date, differential: h.differential } as HandicapInput;
        } else {
            return { id: h.id, date: h.date, score: h.score, rating: h.rating, slope: h.slope } as HandicapInput;
        }
    });
}
