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

        let round: any = null;
        try {
            round = await (prisma.round as any).findUnique({
                where: { id: roundId },
                include: includeOpts
            });
        } catch (err) {
            console.error('[getPoolResults] Failed searching prisma.round:', err);
        }

        let isLive = false;
        if (!round) {
            try {
                round = await (prisma.liveRound as any).findUnique({
                    where: { id: roundId },
                    include: includeOpts
                });
                if (round) isLive = true;
            } catch (err) {
                console.error('[getPoolResults] Failed searching prisma.liveRound:', err);
            }
        }

        if (!round) {
            console.warn('[getPoolResults] Round not found for id:', roundId);
            return { success: false, error: 'Round not found: ' + roundId };
        }

        // Fetch in_pool status
        let poolStatusRaw: any[] = [];
        try {
            poolStatusRaw = isLive
                ? await (prisma as any).liveRoundPlayer.findMany({ where: { liveRoundId: round.id }, select: { id: true, inPool: true } })
                : await (prisma as any).roundPlayer.findMany({ where: { roundId: round.id }, select: { id: true, inPool: true } });
        } catch (err) {
            console.error('[getPoolResults] Failed fetching pool status:', err);
        }

        const poolStatusMap = new Map((poolStatusRaw || []).map((p: any) => [p.id, Boolean(p.inPool)]));

        // Fetch all round dates for selector
        let allRounds: any[] = [];
        try {
            allRounds = await prisma.round.findMany({
                orderBy: { date: 'desc' },
                take: 50,
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
        } catch (err) {
            console.error('[getPoolResults] Failed fetching allRounds:', err);
        }

        const playersRaw = (round.players || []) as any[];
        console.log(`[getPoolResults] Processing ${playersRaw.length} players for round ${round.id}`);

        const allPoolParticipants = playersRaw.filter((rp: any) => {
            const inPool = poolStatusMap.get(rp.id) === true;
            return inPool;
        });

        const poolActivePlayers = allPoolParticipants.filter((rp: any) => {
            const hasTee = !!rp.teeBox;
            const hasScore = rp.grossScore !== null || (rp.scores && rp.scores.length > 0);
            return hasTee && hasScore;
        });

        const entryFeeVal = Number(entryFee) || 10.00;
        const totalPot = poolActivePlayers.length * entryFeeVal; // Use ACTIVE players for pot calculation if preferred, but usually it's everyone IN POOL. 
        // Re-aligning with typical logic: it's all participants.
        const actualPot = allPoolParticipants.length * entryFeeVal;

        const flights = [
            { name: "All Players", players: poolActivePlayers, pot: actualPot }
        ];

        const holes = round.course?.holes || [];
        const par = holes.length > 0 ? holes.reduce((sum: number, h: any) => sum + (h.par || 4), 0) : 72;

        const calc = (rp: any) => {
            const courseHcp = Number(rp.courseHandicap) || 0;

            let frontGross = Number(rp.frontNine) || 0;
            let backGross = Number(rp.backNine) || 0;

            const scores = rp.scores || [];
            if (!frontGross || !backGross) {
                const f = scores
                    .filter((s: any) => s.hole?.holeNumber <= 9)
                    .reduce((sum: number, s: any) => sum + (s.strokes || 0), 0);
                const b = scores
                    .filter((s: any) => s.hole?.holeNumber > 9)
                    .reduce((sum: number, s: any) => sum + (s.strokes || 0), 0);

                if (f > 0) frontGross = f;
                if (b > 0) backGross = b;
            }

            const totalGross = Number(rp.grossScore) || (frontGross + backGross) || 0;

            if (frontGross === 0 && totalGross > 0) frontGross = Math.floor(totalGross / 2);
            if (backGross === 0 && totalGross > 0) backGross = Math.ceil(totalGross / 2);

            let frontHcp = 0;
            let backHcp = 0;

            if (holes.length > 0) {
                holes.forEach((h: any) => {
                    const diff = Number(h.difficulty || h.holeNumber || 18);
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

            const frontNet = frontGross > 0 ? frontGross - frontHcp : 999;
            const backNet = backGross > 0 ? backGross - backHcp : 999;
            const totalNet = totalGross > 0 ? totalGross - courseHcp : 999;

            const grossHoleScores = (rp.scores || []).map((s: any) => {
                const h = s.hole || { holeNumber: 0, difficulty: 18 };
                const diff = Number(h.difficulty || h.holeNumber || 18);
                return {
                    holeNumber: Number(h.holeNumber),
                    difficulty: diff,
                    grossScore: Number(s.strokes || 0)
                };
            }).sort((a: any, b: any) => a.difficulty - b.difficulty);

            return {
                id: String(rp.playerId || rp.id),
                name: String(rp.isGuest ? (rp.guestName || 'Guest') : (rp.player?.name || 'Unknown')),
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
            const results = (f.players || []).map(calc);
            const potPerSegment = Number(actualPot) / 3;

            const getWinners = (category: 'frontNet' | 'backNet' | 'totalNet', pot: number) => {
                const filteredResults = results.filter(r => r[category] < 500);
                if (filteredResults.length === 0 || pot <= 0) return [];

                const sorted = [...filteredResults].sort((a: any, b: any) => a[category] - b[category]);
                const lowScore = sorted[0][category];

                const winners = filteredResults.filter((r: any) => r[category] === lowScore);
                const grossPayout = pot / winners.length;

                return winners.map((w: any) => ({
                    ...w,
                    score: Number(w[category]),
                    gross: Number(category === 'frontNet' ? w.frontGross : category === 'backNet' ? w.backGross : w.totalGross),
                    amount: Number(grossPayout),
                    position: 1
                }));
            };

            return {
                name: String(f.name),
                results,
                frontWinners: getWinners('frontNet', potPerSegment),
                backWinners: getWinners('backNet', potPerSegment),
                totalWinners: getWinners('totalNet', potPerSegment),
                pots: { front: Number(potPerSegment), back: Number(potPerSegment), total: Number(potPerSegment) }
            };
        });

        const winningsMap = new Map<string, number>();
        processedFlights.forEach((f: any) => {
            [...f.frontWinners, ...f.backWinners, ...f.totalWinners].forEach((w: any) => {
                const current = winningsMap.get(w.name) || 0;
                winningsMap.set(w.name, current + w.amount);
            });
        });

        const winningsArray = Array.from(winningsMap.entries());

        return JSON.parse(JSON.stringify({
            success: true,
            data: {
                allPoolParticipants: allPoolParticipants.map(p => ({
                    id: String(p.id),
                    player_id: String(p.playerId || p.id),
                    player: { name: String(p.isGuest ? (p.guestName || 'Guest') : (p.player?.name || 'Unknown')) }
                })),
                poolActivePlayers: poolActivePlayers.map(p => ({
                    id: String(p.id),
                    player_id: String(p.playerId || p.id),
                    player: { name: String(p.isGuest ? (p.guestName || 'Guest') : (p.player?.name || 'Unknown')) }
                })),
                round: {
                    id: String(round.id),
                    date: String(round.date || ''),
                    name: String(round.name || ''),
                    isTournament: Boolean(round.isTournament),
                    players: (round.players || []).map((rp: any) => ({
                        id: String(rp.id),
                        player_id: String(rp.playerId || rp.id),
                        player: {
                            id: String(rp.player?.id || rp.id),
                            name: String(rp.isGuest ? (rp.guestName || 'Guest') : (rp.player?.name || 'Unknown'))
                        }
                    }))
                },
                flights: processedFlights.map(f => ({
                    name: String(f.name),
                    pot: Number(f.pots.front + f.pots.back + f.pots.total),
                    playerCount: Number(f.results.length)
                })),
                processedFlights: processedFlights.map(f => ({
                    name: String(f.name),
                    results: f.results.map((r: any) => ({
                        ...r,
                        grossHoleScores: r.grossHoleScores.map((s: any) => ({ ...s }))
                    })),
                    frontWinners: (f.frontWinners || []).map((w: any) => ({ ...w })),
                    backWinners: (f.backWinners || []).map((w: any) => ({ ...w })),
                    totalWinners: (f.totalWinners || []).map((w: any) => ({ ...w })),
                    pots: { ...f.pots }
                })),
                winningsArray: winningsArray.map(([name, amount]) => [String(name), Number(amount)]),
                allRounds: (allRounds || []).map(r => ({
                    id: String(r.id),
                    date: String(r.date),
                    name: String(r.name || ''),
                    isTournament: Boolean(r.isTournament)
                }))
            }
        }));

    } catch (e) {
        console.error('[getPoolResults] FATAL ERROR:', e);
        return { success: false, error: 'Internal server error: ' + (e instanceof Error ? e.message : String(e)) };
    }
}
