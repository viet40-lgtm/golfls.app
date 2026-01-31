'use server';

import { prisma } from '@/lib/prisma';
import { calculateHandicap, HandicapInput } from '@/lib/handicap';

/**
 * Recalculate handicap for a single player after a score update
 */
export async function recalculatePlayerHandicap(playerId: string) {
    try {
        // Fetch player with all rounds
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            include: {
                rounds: {
                    include: { round: true, teeBox: true },
                    orderBy: { round: { date: 'asc' } }
                }
            }
        });

        if (!player) {
            console.error(`Player ${playerId} not found`);
            return;
        }

        const roundsRaw = player.rounds;

        const history: HandicapInput[] = roundsRaw
            .filter((r: any) => {
                const isNotLive = r.round.isLive !== true;
                const score = r.netScore || r.grossScore; // Use netScore if mostly reliable, or grossScore

                // Assuming netScore is what we want or gross. 
                // calculateHandicap usually takes Gross + Rating/Slope OR Differential.
                // If we pass score/rating/slope, it calculates diff.
                // If netScore is available, maybe use it? But formula usually starts with Gross.
                // Let's stick to using grossScore and TeeBox info.

                const validScore = r.grossScore && r.grossScore > 0;

                return r.teeBox && validScore && isNotLive;
            })
            .map((r: any) => ({
                id: r.id,
                date: r.round.date,
                score: r.grossScore || 0,
                rating: r.teeBox!.rating,
                slope: r.teeBox!.slope
            }));

        // Calculate Final Player Index
        // lowHandicapIndex is removed from schema, passing undefined/null or 0 if calc supports it
        const finalStats = calculateHandicap(history, undefined);

        await prisma.player.update({
            where: { id: player.id },
            data: { handicapIndex: finalStats.handicapIndex }
        });

        console.log(`✅ Recalculated handicap for player ${player.name}: ${finalStats.handicapIndex.toFixed(1)}`);

    } catch (error) {
        console.error(`Error recalculating handicap for player ${playerId}:`, error);
    }
}
