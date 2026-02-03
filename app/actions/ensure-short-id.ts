'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Ensures a live round has a shortId. If missing, generates one and saves it.
 */
export async function ensureRoundHasShortId(roundId: string) {
    if (!roundId) return null;

    try {
        const round = await prisma.liveRound.findUnique({
            where: { id: roundId },
            select: { id: true, shortId: true }
        });

        if (!round) return null;
        if (round.shortId) return round.shortId;

        // Generate new shortId
        let shortId = '';
        let isUnique = false;
        let attempts = 0;
        const initial = 'R';

        while (!isUnique && attempts < 15) {
            const randomNums = Math.floor(100 + Math.random() * 900).toString();
            shortId = `${initial}${randomNums}`;

            const existing = await prisma.liveRound.findUnique({
                where: { shortId }
            });
            if (!existing) isUnique = true;
            attempts++;
        }

        if (isUnique) {
            await prisma.liveRound.update({
                where: { id: roundId },
                data: { shortId }
            });
            console.log(`Self-healed missing shortId for round ${roundId}: ${shortId}`);
            revalidatePath('/');
            revalidatePath('/live');
            return shortId;
        }
    } catch (e) {
        console.error('Failed to ensure shortId:', e);
    }
    return null;
}
