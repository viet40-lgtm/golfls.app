'use server';

import { prisma } from '@/lib/prisma';

export async function getPoolResults(roundId: string, entryFee: number = 10.00) {
    try {
        const includeOpts = {
            course: {
                include: { holes: true, teeBoxes: true }
            },
            players: {
                include: {
                    player: true,
                    teeBox: true,
                    scores: {
                        orderBy: { hole: { holeNumber: 'asc' as const } },
                        include: { hole: true }
                    }
                }
            }
        };

        let round = await (prisma.round as any).findUnique({
            where: { id: roundId },
            include: includeOpts
        });

        let isLive = false;
        if (!round) {
            round = await (prisma.liveRound as any).findUnique({
                where: { id: roundId },
                include: includeOpts
            });
            if (round) isLive = true;
        }

        if (!round) {
            return { success: false, error: 'Round not found' };
        }

        // Fetch in_pool status
        const poolStatusRaw = isLive
            ? await (prisma as any).liveRoundPlayer.findMany({ where: { liveRoundId: round.id }, select: { id: true, inPool: true } })
            : await (prisma as any).roundPlayer.findMany({ where: { roundId: round.id }, select: { id: true, inPool: true } });

        const poolStatusMap = new Map((poolStatusRaw as any[]).map((p: any) => [p.id, Boolean(p.inPool)]));

        // Fetch all round dates for selector
        const allRounds = await prisma.round.findMany({
            orderBy: { date: 'desc' },
            select: {
                date: true,
                id: true,
                isTournament: true,
                name: true,
                _count: {
                    select: { players: true }
                }
            }
        });

        const playersRaw = round.players as any[];
        console.log(`[getPoolResults] Found ${playersRaw.length} total players in round`);

        const allPoolParticipants = playersRaw.filter((rp: any) => {
            const inPool = poolStatusMap.get(rp.id) === true;
            return inPool;
        });
        console.log(`[getPoolResults] ${allPoolParticipants.length} players are in the pool`);

        const poolActivePlayers = allPoolParticipants.filter((rp: any) => rp.teeBox && (rp.grossScore !== null || rp.scores?.length > 0));
        console.log(`[getPoolResults] ${poolActivePlayers.length} active players with scores`);

        // Determine Pots (Nassau Style)
        const totalPot = allPoolParticipants.length * entryFee;

        const flights = [
            { name: "All Players", players: poolActivePlayers, pot: totalPot }
        ];

        const par = round.course?.holes.reduce((sum: number, h: any) => sum + h.par, 0) || 72;

        const calc = (rp: any) => {
            const courseHcp = rp.courseHandicap;

            let frontGross = rp.frontNine;
            let backGross = rp.backNine;

            if (!frontGross || !backGross) {
                const scores = rp.scores || [];
                const f = scores
                    .filter((s: any) => s.hole.holeNumber <= 9)
                    .reduce((sum: number, s: any) => sum + s.strokes, 0);
                const b = scores
                    .filter((s: any) => s.hole.holeNumber > 9)
                    .reduce((sum: number, s: any) => sum + s.strokes, 0);

                if (f > 0) frontGross = f;
                if (b > 0) backGross = b;
            }

            const totalGross = rp.grossScore || (frontGross + backGross) || 0;

            if (!frontGross && totalGross > 0) frontGross = Math.floor(totalGross / 2);
            if (!backGross && totalGross > 0) backGross = Math.ceil(totalGross / 2);

            let frontHcp = 0;
            let backHcp = 0;

            if (round.course?.holes && round.course.holes.length > 0) {
                round.course.holes.forEach((h: any) => {
                    const diff = h.difficulty || h.holeNumber || 18;
                    const baseStrokes = Math.floor(courseHcp / 18);
                    const remainder = courseHcp % 18;
                    const extraStroke = diff <= remainder ? 1 : 0;
                    const hcpStrokes = baseStrokes + extraStroke;

                    if (h.holeNumber <= 9) frontHcp += hcpStrokes;
                    else backHcp += hcpStrokes;
                });
            } else {
                frontHcp = Math.round(courseHcp / 2);
                backHcp = courseHcp - frontHcp;
            }

            const frontNet = frontGross - frontHcp;
            const backNet = backGross - backHcp;
            const totalNet = totalGross - courseHcp;

            const grossHoleScores = (rp.scores || []).map((s: any) => {
                const h = s.hole;
                const diff = h.difficulty || h.holeNumber || 18;
                return {
                    holeNumber: h.holeNumber,
                    difficulty: diff,
                    grossScore: s.strokes
                };
            }).sort((a: any, b: any) => a.difficulty - b.difficulty);

            return {
                id: rp.playerId || rp.id,
                name: rp.isGuest ? (rp.guestName || 'Guest') : (rp.player?.name || 'Unknown'),
                courseHcp,
                frontHcp,
                backHcp,
                frontGross,
                backGross,
                totalGross,
                frontNet,
                backNet,
                totalNet,
                grossHoleScores
            };
        };

        const processedFlights = flights.map((f: any) => {
            const results = f.players.map(calc);
            // In a Nassau, the 'entryFee' is the bet PER segment (Front, Back, Total)
            const potPerSegment = allPoolParticipants.length * entryFee;

            const getWinners = (category: 'frontNet' | 'backNet' | 'totalNet', pot: number) => {
                if (results.length === 0 || pot <= 0) return [];

                const sorted = [...results].sort((a: any, b: any) => a[category] - b[category]);
                const lowScore = sorted[0][category];

                const winners = results.filter((r: any) => r[category] === lowScore);
                const grossPayout = pot / winners.length;

                const netProfit = grossPayout - entryFee;

                return winners.map((w: any) => ({
                    ...w,
                    score: w[category],
                    gross: category === 'frontNet' ? w.frontGross : category === 'backNet' ? w.backGross : w.totalGross,
                    amount: netProfit,
                    position: 1
                }));
            };

            return {
                name: f.name,
                results,
                frontWinners: getWinners('frontNet', potPerSegment),
                backWinners: getWinners('backNet', potPerSegment),
                totalWinners: getWinners('totalNet', potPerSegment),
                pots: { front: potPerSegment, back: potPerSegment, total: potPerSegment }
            };
        });
        console.log(`[getPoolResults] Processed ${processedFlights.length} flights`);

        const winningsMap = new Map<string, number>();
        processedFlights.forEach((f: any) => {
            [...f.frontWinners, ...f.backWinners, ...f.totalWinners].forEach((w: any) => {
                const current = winningsMap.get(w.name) || 0;
                winningsMap.set(w.name, current + w.amount);
            });
        });

        const winningsArray = Array.from(winningsMap.entries());

        return {
            success: true,
            data: {
                allPoolParticipants: allPoolParticipants.map(p => ({
                    id: p.id,
                    player_id: p.playerId || p.id,
                    player: { name: p.isGuest ? (p.guestName || 'Guest') : (p.player?.name || 'Unknown') }
                })),
                poolActivePlayers: poolActivePlayers.map(p => ({
                    id: p.id,
                    player_id: p.playerId || p.id,
                    player: { name: p.isGuest ? (p.guestName || 'Guest') : (p.player?.name || 'Unknown') }
                })),
                round: {
                    id: round.id,
                    date: round.date,
                    name: round.name,
                    isTournament: round.isTournament || false,
                    players: round.players.map((rp: any) => ({
                        id: rp.id,
                        player_id: rp.playerId || rp.id,
                        player: {
                            id: rp.player?.id || rp.id,
                            name: rp.isGuest ? (rp.guestName || 'Guest') : (rp.player?.name || 'Unknown')
                        }
                    }))
                },
                flights: processedFlights.map(f => ({
                    name: f.name,
                    pot: (f.pots.front + f.pots.back + f.pots.total),
                    playerCount: f.results.length
                })),
                processedFlights,
                winningsArray,
                allRounds: allRounds.slice(0, 50).map(r => ({
                    id: r.id,
                    date: r.date,
                    name: r.name,
                    isTournament: r.isTournament
                }))
            }
        };

    } catch (e) {
        console.error('Error in getPoolResults for roundId:', roundId, e);
        return { success: false, error: 'Internal server error: ' + (e instanceof Error ? e.message : String(e)) };
    }
}
