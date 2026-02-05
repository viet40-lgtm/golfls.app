
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        console.log("API: /api/live-data called");
        const { searchParams } = new URL(request.url);
        const todayStr = searchParams.get('date');

        if (!todayStr) {
            return NextResponse.json({ error: 'Date required' }, { status: 400 });
        }

        const session = await getSession();

        // 1. Get all live rounds
        const allLiveRounds = await prisma.liveRound.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: { id: true, name: true, date: true }
        });

        // 2. Find active round
        let activeRound = null;
        let lastUsedCourseId = null;
        let lastUsedTeeBoxId = null;

        if (session && session.email) {
            const userRoundPlayer = await prisma.liveRoundPlayer.findFirst({
                where: {
                    player: { email: session.email },
                    liveRound: { date: todayStr }
                },
                include: {
                    liveRound: {
                        include: {
                            course: { include: { teeBoxes: true, holes: true } },
                            players: true
                        }
                    }
                }
            });

            if (userRoundPlayer) {
                activeRound = userRoundPlayer.liveRound;
            }

            const player = await prisma.player.findUnique({
                where: { email: session.email },
                select: { id: true }
            });
        }

        // Return standard JSON response
        return NextResponse.json({
            activeRound,
            allLiveRounds,
            lastUsedCourseId,
            lastUsedTeeBoxId
        });

    } catch (error: any) {
        console.error("API ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
