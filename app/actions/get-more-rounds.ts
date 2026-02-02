'use server'

import { prisma } from '@/lib/prisma'

export async function getMoreRounds(userId: string, offset: number = 10, limit: number = 10) {
    const userRoundPlayers = await prisma.liveRoundPlayer.findMany({
        where: { playerId: userId },
        orderBy: { liveRound: { date: 'desc' } },
        skip: offset,
        take: limit,
        select: {
            liveRound: {
                select: { id: true, name: true, date: true, createdAt: true }
            }
        }
    });

    // Extract unique rounds
    const seenRoundIds = new Set();
    const rounds = userRoundPlayers
        .map(rp => rp.liveRound)
        .filter(r => {
            if (seenRoundIds.has(r.id)) return false;
            seenRoundIds.add(r.id);
            return true;
        })
        .map(r => ({ ...r, created_at: r.createdAt.toISOString() }));

    return JSON.parse(JSON.stringify(rounds));
}
