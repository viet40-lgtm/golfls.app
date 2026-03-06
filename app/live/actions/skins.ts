'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const BASE_SKINS_TYPE = 'SKINS_ENTRY';
const SKINS_CARRYOVER_TYPE = 'SKINS_CARRYOVER';

export async function getSkinsParticipants(liveRoundId: string) {
    const events = await prisma.moneyEvent.findMany({
        where: {
            roundId: liveRoundId,
            eventType: {
                contains: 'SKINS_'
            }
        }
    });

    const groups: Record<string, string[]> = { '1': [] };
    const carryOvers: Record<string, boolean> = {};

    events.forEach(e => {
        if (e.eventType.startsWith(BASE_SKINS_TYPE)) {
            let group = '1';
            if (e.eventType.includes(':')) {
                group = e.eventType.split(':')[1];
            }
            if (!groups[group]) groups[group] = [];
            groups[group].push(e.playerId);
        } else if (e.eventType.startsWith(SKINS_CARRYOVER_TYPE)) {
            let group = '1';
            if (e.eventType.includes(':')) {
                group = e.eventType.split(':')[1];
            }
            carryOvers[group] = e.amount === 1;
        }
    });

    // Default carryovers to true if not specified
    Object.keys(groups).forEach(gid => {
        if (carryOvers[gid] === undefined) carryOvers[gid] = true;
    });

    return { participants: groups, carryOvers };
}

export async function joinSkins(liveRoundId: string, playerId: string, group: string = '1') {
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

export async function leaveSkins(liveRoundId: string, playerId: string, group: string = '1') {
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

export async function updateSkinsParticipants(
    liveRoundId: string,
    participants: Record<string, string[]>,
    carryOvers: Record<string, boolean> = {}
) {
    if (!liveRoundId) return;

    // First delete all existing skins configurations for this round
    await prisma.moneyEvent.deleteMany({
        where: {
            roundId: liveRoundId,
            eventType: {
                contains: 'SKINS_'
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

        // Add carryover setting if it exists, default to true
        const isCarryOver = carryOvers[group] ?? true;
        inserts.push({
            roundId: liveRoundId,
            playerId: 'SYSTEM', // special ID for settings
            eventType: `${SKINS_CARRYOVER_TYPE}:${group}`,
            amount: isCarryOver ? 1 : 0,
            holeNumber: 0
        });
    }

    if (inserts.length > 0) {
        await prisma.moneyEvent.createMany({
            data: inserts
        });
    }

    revalidatePath('/live');
}
