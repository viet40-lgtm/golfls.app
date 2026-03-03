'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { calculateTourneyPayouts, calculatePoolWinnings } from '@/lib/payout-logic';

function isSaturday(dateStr: string): boolean {
    const d = new Date(dateStr + 'T12:00:00');
    return d.getDay() === 6;
}

export async function recalculatePayouts() {
    try {
        console.log('--- RECALCULATE ALL WINNINGS START ---');

        // 1. Fetch all rounds that might have payouts (tournaments or pool participants)
        const allRounds = await prisma.round.findMany({
            include: {
                players: {
                    include: {
                        teeBox: true,
                        player: true,
                        scores: {
                            include: { hole: true }
                        }
                    }
                },
                course: {
                    include: { holes: true }
                }
            },
            orderBy: { date: 'asc' }
        });

        if (allRounds.length === 0) {
            return { success: true, message: 'No rounds found to recalculate.' };
        }

        // 3. Group rounds by Year and Tournament Name to detect Multi-Round Tournaments
        const tourneyGroups: Record<string, string[]> = {}; // "Year-Name" -> [roundIds]
        allRounds.forEach(r => {
            if (r.isTournament && r.name && r.name.trim() !== '') {
                const year = r.date.substring(0, 4);
                const key = `${year}-${r.name.trim().toLowerCase()}`;
                if (!tourneyGroups[key]) tourneyGroups[key] = [];
                tourneyGroups[key].push(r.id);
            }
        });

        let totalUpdated = 0;
        let roundsProcessed = 0;

        // 4. Process each round
        for (const round of allRounds) {
            const roundDate = round.date.split('T')[0];
            const isSat = isSaturday(roundDate);

            // Per Rule 16: Only Saturday rounds count for payouts/points
            if (!isSat) {
                // Zero out any payouts for non-Saturday rounds
                for (const rp of round.players) {
                    if (rp.payout !== 0) {
                        await prisma.roundPlayer.update({
                            where: { id: rp.id },
                            data: { payout: 0 }
                        });
                        totalUpdated++;
                    }
                }
                continue;
            }

            roundsProcessed++;

            // Detect if multi-round
            let isMulti = false;
            if (round.isTournament && round.name) {
                const year = round.date.substring(0, 4);
                const key = `${year}-${round.name.trim().toLowerCase()}`;
                if (tourneyGroups[key] && tourneyGroups[key].length > 1) {
                    isMulti = true;
                }
            }

            // Calculate Tournament Payouts
            const tourneyWinnings = round.isTournament
                ? calculateTourneyPayouts(round, isMulti)
                : new Map<string, number>();

            // Calculate Pool Winnings
            const poolWinnings = calculatePoolWinnings(round);

            // Update all players in this round
            for (const rp of round.players) {
                const tAmt = tourneyWinnings.get(rp.playerId) || 0;
                const pAmt = poolWinnings.get(rp.playerId) || 0;
                const total = tAmt + pAmt;

                if (rp.payout !== total) {
                    await prisma.roundPlayer.update({
                        where: { id: rp.id },
                        data: { payout: total }
                    });
                    totalUpdated++;
                }
            }
        }

        revalidatePath('/players');
        revalidatePath('/scores');

        console.log(`--- RECALCULATE SUCCESS: ${totalUpdated} updates across ${roundsProcessed} Saturday rounds ---`);

        return {
            success: true,
            message: `✅ Recalculation complete! Updated ${totalUpdated} payout record(s) across ${roundsProcessed} Saturday round(s). Covers All-Time, Tournament, and $5 Pool.`
        };
    } catch (error) {
        console.error('Failed to recalculate all winnings:', error);
        return { success: false, message: `❌ Error: ${(error as Error).message}` };
    }
}
