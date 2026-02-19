
'use server';

import { prisma } from '@/lib/prisma';

export async function getScorecardDetails(roundPlayerId: string) {
    try {
        const roundPlayer = await prisma.roundPlayer.findUnique({
            where: { id: roundPlayerId },
            include: {
                player: true,
                round: {
                    include: {
                        course: {
                            include: {
                                holes: {
                                    orderBy: { holeNumber: 'asc' }
                                }
                            }
                        }
                    }
                },
                teeBox: true,
                scores: {
                    include: {
                        hole: true
                    },
                    orderBy: {
                        hole: {
                            holeNumber: 'asc'
                        }
                    }
                }
            }
        });

        if (!roundPlayer) {
            return { error: 'Scorecard not found' };
        }

        return { data: roundPlayer };
    } catch (error) {
        console.error('Error fetching scorecard:', error);
        return { error: 'Failed to fetch scorecard details' };
    }
}
