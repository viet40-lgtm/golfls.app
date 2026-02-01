'use server';

import { prisma } from '@/lib/prisma';

export interface UserRoundHistory {
    id: string;
    date: string;
    courseName: string;
    grossScore: number;
    score: number;
    teeBox: string | null;
    scores?: Record<number, number>; // Hole Number -> Strokes
}

export async function getUserRounds(userId: string): Promise<UserRoundHistory[]> {
    if (!userId) return [];

    try {
        const rounds = await prisma.roundPlayer.findMany({
            where: { playerId: userId },
            include: {
                round: true,
                teeBox: true,
                scores: {
                    include: { hole: true }
                }
            },
            orderBy: {
                round: { date: 'desc' }
            },
            take: 20 // Limit to last 20 rounds per user request
        });

        return rounds.map(r => {
            const scoreMap: Record<number, number> = {};
            r.scores.forEach(s => {
                if (s.hole?.holeNumber) {
                    scoreMap[s.hole.holeNumber] = s.strokes;
                }
            });

            return {
                id: r.roundId,
                date: r.round.date,
                courseName: r.round.courseName,
                grossScore: r.grossScore || 0,
                score: r.grossScore || 0,
                teeBox: r.teeBox?.name || null,
                scores: scoreMap
            };
        });
    } catch (error) {
        console.error('Error fetching user rounds:', error);
        return [];
    }
}
