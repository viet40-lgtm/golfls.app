'use server'

import { prisma } from '@/lib/prisma'

export async function getAllPlayers() {
    try {
        const players = await prisma.player.findMany({
            select: {
                id: true,
                name: true,
                handicapIndex: true,
                preferredTeeBox: true,
                phone: true,
                playerId: true,
                email: true
            },
            orderBy: { name: 'asc' }
        });

        // Convert to the exact shape expected by LiveScoreClient interface
        const results = players.map(p => ({
            id: p.id,
            name: p.name,
            index: p.handicapIndex ?? 0,
            handicapIndex: p.handicapIndex ?? 0,
            preferred_tee_box: p.preferredTeeBox,
            preferredTeeBox: p.preferredTeeBox,
            phone: p.phone,
            player_id: p.playerId,
            email: p.email
        }));

        return JSON.parse(JSON.stringify(results));
    } catch (error) {
        console.error('getAllPlayers Failed:', error);
        return [];
    }
}
