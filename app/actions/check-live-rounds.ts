'use server';

import { prisma } from '@/lib/prisma';

/**
 * Diagnostic: Check all live rounds in the database
 */
export async function checkLiveRounds() {
    try {
        const rounds = await prisma.liveRound.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                players: {
                    select: {
                        id: true,
                        player: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Chicago',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        const details = rounds.map(r => ({
            id: r.id,
            name: r.name,
            date: r.date,
            isToday: r.date === today,
            createdAt: r.createdAt.toISOString(),
            courseName: r.courseName,
            playerCount: r.players.length,
            players: r.players.map(p => p.player?.name || 'Guest')
        }));

        return {
            success: true,
            today,
            totalRounds: rounds.length,
            rounds: details
        };

    } catch (error) {
        console.error('Error checking live rounds:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            error: String(error)
        };
    }
}
