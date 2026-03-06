import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    const start = Date.now();
    try {
        const body = await req.json();
        const { liveRoundId, holeNumber, playerScores, scorerId } = body;

        console.log(`[API sync-score] Starting for hole ${holeNumber}`);

        // 1. Initial Fetch
        const liveRound = await prisma.liveRound.findUnique({
            where: { id: liveRoundId },
            include: { course: { include: { holes: true } } }
        });

        if (!liveRound) return NextResponse.json({ success: false, error: 'Live round not found' }, { status: 404 });

        const hole = liveRound.course.holes.find(h => h.holeNumber === holeNumber);
        if (!hole) return NextResponse.json({ success: false, error: `Hole ${holeNumber} not found` }, { status: 404 });

        const mid = Date.now();
        console.log(`[API sync-score] Initial fetch took ${mid - start}ms`);

        // 2. Fetch all relevant LiveRoundPlayers and existing LiveScores in ONE query each
        const playerIds = playerScores.map((ps: any) => ps.playerId);

        const liveRoundPlayers = await prisma.liveRoundPlayer.findMany({
            where: {
                liveRoundId: liveRoundId,
                OR: [{ playerId: { in: playerIds } }, { id: { in: playerIds } }]
            }
        });

        const liveRoundPlayerIds = liveRoundPlayers.map(p => p.id);

        const existingScores = await prisma.liveScore.findMany({
            where: {
                liveRoundPlayerId: { in: liveRoundPlayerIds },
                holeId: hole.id
            }
        });

        const allScoresForPlayers = await prisma.liveScore.findMany({
            where: { liveRoundPlayerId: { in: liveRoundPlayerIds } },
            include: { hole: { select: { holeNumber: true } } }
        });

        // 3. Prepare the massive transaction operations array
        const transactionOps: any[] = [];

        liveRoundPlayers.forEach(player => {
            const targetScore = playerScores.find((ps: any) => ps.playerId === player.playerId || ps.playerId === player.id)?.strokes;
            if (targetScore === undefined) return;

            if (player.scorerId !== scorerId) {
                transactionOps.push(
                    prisma.liveRoundPlayer.update({
                        where: { id: player.id },
                        data: { scorerId: scorerId }
                    })
                );
            }

            const existingScore = existingScores.find(s => s.liveRoundPlayerId === player.id);
            if (existingScore) {
                transactionOps.push(
                    prisma.liveScore.update({
                        where: { id: existingScore.id },
                        data: { strokes: targetScore }
                    })
                );
            } else {
                transactionOps.push(
                    prisma.liveScore.create({
                        data: {
                            liveRoundPlayerId: player.id,
                            holeId: hole.id,
                            strokes: targetScore
                        }
                    })
                );
            }

            let gross = 0;
            let front = 0;
            let back = 0;
            let foundCurrentHole = false;

            allScoresForPlayers
                .filter(s => s.liveRoundPlayerId === player.id)
                .forEach(s => {
                    const isCurrentHole = s.hole?.holeNumber === holeNumber;
                    const effectiveStrokes = isCurrentHole ? targetScore : s.strokes;

                    if (isCurrentHole) foundCurrentHole = true;
                    if (!s.hole?.holeNumber) return;

                    gross += effectiveStrokes;
                    if (s.hole.holeNumber <= 9) front += effectiveStrokes;
                    else back += effectiveStrokes;
                });

            if (!foundCurrentHole) {
                gross += targetScore;
                if (holeNumber <= 9) front += targetScore;
                else back += targetScore;
            }

            transactionOps.push(
                prisma.liveRoundPlayer.update({
                    where: { id: player.id },
                    data: {
                        grossScore: gross,
                        frontNine: front > 0 ? front : null,
                        backNine: back > 0 ? back : null
                    }
                })
            );
        });

        // 4. Execute all queries in a single transaction
        const beforeTx = Date.now();
        await prisma.$transaction(transactionOps);

        const end = Date.now();
        console.log(`[API sync-score] Transaction took ${end - beforeTx}ms. Total: ${end - start}ms`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to sync live score:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save score'
        }, { status: 500 });
    }
}
