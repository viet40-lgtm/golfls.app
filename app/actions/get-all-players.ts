'use server';

import { prisma } from '@/lib/prisma';

export async function getAllPlayers() {
    try {
        const players = await prisma.player.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                playerId: true,
                name: true,
                handicapIndex: true,
                preferredTeeBox: true,
                phone: true,
            }
        });

        return players.map(p => ({
            id: p.id,
            player_id: p.playerId,
            name: p.name,
            index: p.handicapIndex,
            preferred_tee_box: p.preferredTeeBox,
            phone: p.phone
        }));
    } catch (error) {
        console.error('Failed to fetch all players:', error);
        return [];
    }
}
