'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const SKINS_ENTRY_TYPE = 'SKINS_ENTRY';

export async function getSkinsParticipants(liveRoundId: string) {
    const events = await prisma.moneyEvent.findMany({
        where: {
            roundId: liveRoundId,
            eventType: SKINS_ENTRY_TYPE
        }
    });
    return events.map(e => e.playerId);
}

export async function joinSkins(liveRoundId: string, playerId: string) {
    if (!liveRoundId || !playerId) return;

    // Check if already joined
    const existing = await prisma.moneyEvent.findFirst({
        where: {
            roundId: liveRoundId,
            playerId: playerId,
            eventType: SKINS_ENTRY_TYPE
        }
    });

    if (existing) return;

    await prisma.moneyEvent.create({
        data: {
            roundId: liveRoundId,
            playerId: playerId,
            eventType: SKINS_ENTRY_TYPE,
            amount: 0,
            holeNumber: 0
        }
    });

    revalidatePath('/live');
}

export async function leaveSkins(liveRoundId: string, playerId: string) {
    if (!liveRoundId || !playerId) return;

    await prisma.moneyEvent.deleteMany({
        where: {
            roundId: liveRoundId,
            playerId: playerId,
            eventType: SKINS_ENTRY_TYPE
        }
    });

    revalidatePath('/live');
}
