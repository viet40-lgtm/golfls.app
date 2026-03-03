'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const BASE_SKINS_TYPE = 'SKINS_ENTRY';

export async function getSkinsParticipants(liveRoundId: string) {
    const events = await prisma.moneyEvent.findMany({
        where: {
            roundId: liveRoundId,
            eventType: {
                startsWith: BASE_SKINS_TYPE
            }
        }
    });

    const groups: Record<string, string[]> = { A: [], B: [] };

    events.forEach(e => {
        // Handle legacy type 'SKINS_ENTRY' as Group A, or extract from 'SKINS_ENTRY:X'
        let group = 'A';
        if (e.eventType.includes(':')) {
            group = e.eventType.split(':')[1];
        }

        if (!groups[group]) groups[group] = [];
        groups[group].push(e.playerId);
    });

    return groups;
}

export async function joinSkins(liveRoundId: string, playerId: string, group: string = 'A') {
    if (!liveRoundId || !playerId) return;

    const eventType = `${BASE_SKINS_TYPE}:${group}`;

    // Check if already joined this specific group
    const existing = await prisma.moneyEvent.findFirst({
        where: {
            roundId: liveRoundId,
            playerId: playerId,
            eventType: eventType
        }
    });

    if (existing) return;

    await prisma.moneyEvent.create({
        data: {
            roundId: liveRoundId,
            playerId: playerId,
            eventType: eventType,
            amount: 0,
            holeNumber: 0
        }
    });

    revalidatePath('/live');
}

export async function leaveSkins(liveRoundId: string, playerId: string, group: string = 'A') {
    if (!liveRoundId || !playerId) return;

    const eventType = `${BASE_SKINS_TYPE}:${group}`;

    await prisma.moneyEvent.deleteMany({
        where: {
            roundId: liveRoundId,
            playerId: playerId,
            eventType: eventType
        }
    });

    revalidatePath('/live');
}

export async function updateSkinsParticipants(liveRoundId: string, participants: Record<string, string[]>) {
    if (!liveRoundId) return;

    // First delete all existing skins configurations for this round
    await prisma.moneyEvent.deleteMany({
        where: {
            roundId: liveRoundId,
            eventType: {
                startsWith: BASE_SKINS_TYPE
            }
        }
    });

    // Then insert the new configuration
    const inserts = [];
    for (const [group, playerIds] of Object.entries(participants)) {
        if (!playerIds || playerIds.length === 0) continue;

        const eventType = `${BASE_SKINS_TYPE}:${group}`;
        for (const playerId of playerIds) {
            inserts.push({
                roundId: liveRoundId,
                playerId: playerId,
                eventType: eventType,
                amount: 0,
                holeNumber: 0
            });
        }
    }

    if (inserts.length > 0) {
        await prisma.moneyEvent.createMany({
            data: inserts
        });
    }

    revalidatePath('/live');
}
