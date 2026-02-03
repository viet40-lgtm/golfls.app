'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { addPlayerToLiveRound } from './create-live-round';

export async function joinLiveRoundByShortId(shortId: string, playerId: string, teeBoxId?: string) {
    try {
        // Find the round
        const liveRound = await prisma.liveRound.findUnique({
            where: { shortId },
            include: { course: { include: { teeBoxes: true } } }
        });

        if (!liveRound) {
            return { success: false, error: 'Round not found' };
        }

        // Determine tee box
        let selectedTeeBoxId = teeBoxId;
        if (!selectedTeeBoxId) {
            // Find White tee or fallback
            const whiteTee = liveRound.course.teeBoxes.find(t => t.name.toLowerCase().includes('white'));
            selectedTeeBoxId = whiteTee?.id || liveRound.course.teeBoxes[0].id;
        }

        const result = await addPlayerToLiveRound({
            liveRoundId: liveRound.id,
            playerId,
            teeBoxId: selectedTeeBoxId
        });

        if (result.success) {
            revalidatePath('/live');
            return { success: true, liveRoundId: liveRound.id };
        } else {
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error joining live round:', error);
        return { success: false, error: 'Failed to join round' };
    }
}
