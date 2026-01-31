'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Removes a player from a live round (works for both guests and regular players)
 */
export async function removePlayerFromLiveRound(liveRoundPlayerId: string) {
    try {
        await prisma.liveRoundPlayer.delete({
            where: { id: liveRoundPlayerId }
        });

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Failed to remove player from live round:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to remove player'
        };
    }
}
