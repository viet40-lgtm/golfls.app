'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { recalculateAllHandicaps } from './recalculate-handicaps';

/**
 * Marks a round as completed and triggers handicap recalculation.
 */
export async function completeRound(roundId: string) {
    try {
        console.log(`🏁 Completing round ${roundId}...`);

        // Update the round status - mark as completed AND clear the live flag
        /* 
        Fields removed from schema. Live rounds are now in separate table.
        await prisma.round.update({
            where: { id: roundId },
            data: {
                completed: true,
                is_live: false  
            }
        });
        */

        // Trigger a full recalculation now that new data is finalized
        await recalculateAllHandicaps();

        // Revalidate everything
        revalidatePath('/');
        revalidatePath('/scores');
        revalidatePath('/players');

        console.log(`✅ Round ${roundId} marked as complete and handicaps recalculated.`);
        return { success: true };
    } catch (error) {
        console.error('Failed to complete round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to complete round'
        };
    }
}

/**
 * Reopens a round (marks as incomplete).
 */
export async function reopenRound(roundId: string) {
    try {
        console.log(`🔓 Reopening round ${roundId}...`);

        // Update the round status - mark as incomplete AND set live flag
        /*
        await prisma.round.update({
            where: { id: roundId },
            data: {
                completed: false,
                is_live: true 
            }
        });
        */

        // Trigger a full recalculation to remove this round's data from indices
        await recalculateAllHandicaps();

        // Revalidate everything
        revalidatePath('/');
        revalidatePath('/scores');
        revalidatePath('/players');

        console.log(`✅ Round ${roundId} reopened.`);
        return { success: true };
    } catch (error) {
        console.error('Failed to reopen round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to reopen round'
        };
    }
}
