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

        const flights = [{ name: 'All Players', players: poolActivePlayers }];

        const calc = (rp: any) => {
            const teeBox = rp.teeBox;
            if (!teeBox) {
                console.warn(`[getPoolResults] Player ${rp.id} has no teeBox assigned.`);
                return null;
            }

            const courseHcp = Number(rp.courseHandicap || 0);
            const holes = round.course?.holes || [];
            if (!holes || holes.length === 0) {
                console.warn(`[getPoolResults] No holes found for round ${round.id}`);
                return null;
            }

            const frontHoles = holes.filter((h: any) => h.holeNumber >= 1 && h.holeNumber <= 9);
            const backHoles = holes.filter((h: any) => h.holeNumber >= 10 && h.holeNumber <= 18);

            const frontHcp = Math.round(courseHcp / 2);
            const backHcp = courseHcp - frontHcp;

            const scores = rp.scores || [];
            const frontGross = scores
                .filter((s: any) => s.hole?.holeNumber >= 1 && s.hole?.holeNumber <= 9)
                .reduce((sum: number, s: any) => sum + Number(s.strokes || 0), 0);

            const backGross = scores
                .filter((s: any) => s.hole?.holeNumber >= 10 && s.hole?.holeNumber <= 18)
                .reduce((sum: number, s: any) => sum + Number(s.strokes || 0), 0);

            const totalGross = frontGross + backGross;

            if (totalGross === 0) {
                console.warn(`[getPoolResults] Player ${rp.id} has no scores recorded.`);
                return null;
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
            const results = (f.players || []).map(calc).filter(Boolean);

            // Head-to-head Nassau calculation
            const winningsMap = new Map<string, number>();

            // Initialize all players to $0
            results.forEach((player: any) => {
                winningsMap.set(player.name, 0);
            });

            // For each pair of players, determine winners for each segment
            for (let i = 0; i < results.length; i++) {
                for (let j = i + 1; j < results.length; j++) {
                    const playerA = results[i];
                    const playerB = results[j];

                    // Front 9 matchup
                    if (playerA.frontNet < playerB.frontNet) {
                        winningsMap.set(playerA.name, (winningsMap.get(playerA.name) || 0) + entryFeeVal);
                        winningsMap.set(playerB.name, (winningsMap.get(playerB.name) || 0) - entryFeeVal);
                    } else if (playerB.frontNet < playerA.frontNet) {
                        winningsMap.set(playerB.name, (winningsMap.get(playerB.name) || 0) + entryFeeVal);
                        winningsMap.set(playerA.name, (winningsMap.get(playerA.name) || 0) - entryFeeVal);
                    }
                    // Tie = push, no money changes hands

                    // Back 9 matchup
                    if (playerA.backNet < playerB.backNet) {
                        winningsMap.set(playerA.name, (winningsMap.get(playerA.name) || 0) + entryFeeVal);
                        winningsMap.set(playerB.name, (winningsMap.get(playerB.name) || 0) - entryFeeVal);
                    } else if (playerB.backNet < playerA.backNet) {
                        winningsMap.set(playerB.name, (winningsMap.get(playerB.name) || 0) + entryFeeVal);
                        winningsMap.set(playerA.name, (winningsMap.get(playerA.name) || 0) - entryFeeVal);
                    }

                    // Total 18 matchup
                    if (playerA.totalNet < playerB.totalNet) {
                        winningsMap.set(playerA.name, (winningsMap.get(playerA.name) || 0) + entryFeeVal);
                        winningsMap.set(playerB.name, (winningsMap.get(playerB.name) || 0) - entryFeeVal);
                    } else if (playerB.totalNet < playerA.totalNet) {
                        winningsMap.set(playerB.name, (winningsMap.get(playerB.name) || 0) + entryFeeVal);
                        winningsMap.set(playerA.name, (winningsMap.get(playerA.name) || 0) - entryFeeVal);
                    }
                }
            }

            // Determine segment winners for display purposes
            const getSegmentWinners = (category: 'frontNet' | 'backNet' | 'totalNet') => {
                const sorted = [...results].sort((a: any, b: any) => a[category] - b[category]);
                if (sorted.length === 0) return [];

                const lowScore = sorted[0][category];
                const winners = results.filter((r: any) => r[category] === lowScore);

                return winners.map((w: any) => {
                    // Calculate how much this winner won for this segment
                    // Count how many opponents they beat (excluding ties)
                    const opponentsBeat = results.filter((opp: any) =>
                        opp.id !== w.id && opp[category] > w[category]
                    ).length;

                    return {
                        ...w,
                        score: Number(w[category]),
                        gross: Number(category === 'frontNet' ? w.frontGross : category === 'backNet' ? w.backGross : w.totalGross),
                        amount: Number(opponentsBeat * entryFeeVal),
                        position: 1
                    };
                });
            };

            return {
                name: String(f.name),
                results,
                frontWinners: getSegmentWinners('frontNet'),
                backWinners: getSegmentWinners('backNet'),
                totalWinners: getSegmentWinners('totalNet'),
                pots: { front: 0, back: 0, total: 0 }, // No pot in head-to-head
                winningsMap
            };
        });

        const globalWinningsMap = new Map<string, number>();
        processedFlights.forEach((f: any) => {
            f.winningsMap.forEach((amount: number, name: string) => {
                const current = globalWinningsMap.get(name) || 0;
                globalWinningsMap.set(name, current + amount);
            });
        });

        const winningsArray = Array.from(globalWinningsMap.entries());

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
