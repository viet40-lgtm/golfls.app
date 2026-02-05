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

        // Convert to the shape expected by LiveScoreClient
        return players.map(p => ({
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
    } catch (error) {
        console.error('getAllPlayers Server Action Failed:', error);
        return [];
    }
}
