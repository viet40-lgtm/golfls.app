'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Saves the prize winnings for a round.
 * This is used for both the $5 pool and other prizes.
 */
export async function saveRoundWinnings(roundId: string, payouts: Array<{ playerId: string, amount: number }>) {
    try {
        console.log(`💰 Saving payouts for round ${roundId}:`, payouts);

        // We use MoneyEvent records for payouts. 
        // Strategy: 
        // 1. Delete existing "skin" and "payout" entries for this round to avoid duplicates on re-save
        // 2. Create new entries for each payout

        await (prisma as any).moneyEvent.deleteMany({
            where: {
                roundId: roundId,
                eventType: { in: ['skin', 'payout'] }
            }
        });

        if (payouts.length === 0) return { success: true };

        // Create the new events
        const createPromises = payouts.filter(p => p.amount !== 0).map(p =>
            (prisma as any).moneyEvent.create({
                data: {
                    roundId: roundId,
                    playerId: p.playerId,
                    amount: p.amount,
                    eventType: 'payout',
                    holeNumber: 0,
                    description: 'Pool Winnings'
                }
            })
        );

        await Promise.all(createPromises);

        revalidatePath('/scores');
        revalidatePath('/live');

        return { success: true };
    } catch (error) {
        console.error('Failed to save winnings:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error saving winnings'
        };
    }
}
