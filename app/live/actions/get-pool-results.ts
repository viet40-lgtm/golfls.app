'use server';

import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';

export async function getPoolResults(roundId: string) {
    noStore();
    try {
        let targetId = roundId;
        if (!targetId || targetId === 'latest') {
            const [lastRound, lastLiveRound] = await Promise.all([
                prisma.round.findFirst({ orderBy: { date: 'desc' as any } as any }),
                prisma.liveRound.findFirst({ orderBy: { date: 'desc' as any } as any })
            ]);

            const rDate = lastRound ? new Date(lastRound.date).getTime() : 0;
            const lDate = lastLiveRound ? new Date(lastLiveRound.date).getTime() : 0;

            if (lDate >= rDate && lastLiveRound) {
                targetId = lastLiveRound.id;
            } else if (lastRound) {
                targetId = lastRound.id;
            }
        }
        console.log("getPoolResults called with:", roundId, "resolving to:", targetId);
        const includeOpts = {
            course: {
                include: {
                    holes: { orderBy: { holeNumber: 'asc' } },
                    teeBoxes: true
                }
            },
            players: {
                include: {
                    player: true,
                    teeBox: true,
                    scores: {
                        include: { hole: true }
                    }
                }
            }
        };

        let round = await prisma.round.findUnique({
            where: { id: targetId },
            include: includeOpts as any
        });

        // If not found in standard rounds, check LiveRounds
        let isLiveRound = false;

        // BRIDGE LOGIC: If we found a standard round, check if it actually has pool data.
        // Users often set up the pool on the Live page but view from the Scores page (Standard Round).
        if (round) {
            const hasPool = (round as any).players.some((p: any) => p.inPool);
            if (!hasPool) {
                // Try to find a matching live round for the same date/course
                const datePrefix = round.date.substring(0, 10);
                const liveRoundFallback = await prisma.liveRound.findFirst({
                    where: {
                        date: { startsWith: datePrefix },
                        courseId: (round as any).courseId
                    }
                });

                if (liveRoundFallback) {
                    console.log(`BRIDGE: Standard round ${targetId} has no pool data, falling back to Live Round ${liveRoundFallback.id}`);
                    targetId = liveRoundFallback.id;
                    round = null; // Clear so it proceeds to check liveRound below
                }
            }
        }

        if (!round) {
            const liveRound = await prisma.liveRound.findUnique({
                where: { id: targetId },
                include: {
                    players: {
                        include: {
                            player: true,
                            scores: {
                                include: { hole: true }
                            }
                        }
                    }
                }
            });

            if (liveRound) {
                isLiveRound = true;
                const course = await prisma.course.findUnique({
                    where: { id: liveRound.courseId },
                    include: {
                        holes: { orderBy: { holeNumber: 'asc' as const } as any },
                        teeBoxes: true
                    }
                }) as any;

                // Map LiveRoundPlayer to the shape getPoolResults expect, 
                // CRITICAL: Ensure we use the actual tee box data stored in the LiveRoundPlayer record
                // to avoid reconciliation errors if lookups by name fail.
                const players = liveRound.players.map((kp: any) => {
                    // Try to find the actual TeeBox object if possible for the slope/rating
                    let teeBox = course?.teeBoxes.find(t =>
                        t.id === kp.teeBoxId ||
                        t.name.toLowerCase().trim() === kp.teeBoxName?.toLowerCase().trim()
                    );

                    // FALLBACK: Use player's preferred tee box if the round one is missing or generic
                    if (!teeBox && kp.player?.preferredTeeBox) {
                        teeBox = course?.teeBoxes.find(t =>
                            t.name.toLowerCase().trim() === kp.player.preferredTeeBox.toLowerCase().trim()
                        );
                    }

                    // If we found a teeBox but it's missing slope/rating (unlikely), 
                    // or if not found, we SYNTHESIZE a teeBox object using the values 
                    // stored directly on the LiveRoundPlayer record.
                    if (!teeBox || !teeBox.slope) {
                        teeBox = {
                            id: kp.teeBoxId || 'manual',
                            name: kp.teeBoxName || kp.player?.preferredTeeBox || 'Default',
                            slope: kp.teeBoxSlope || 113,
                            rating: kp.teeBoxRating || (course?.holes.reduce((s: number, h: any) => s + h.par, 0) || 72),
                            par: kp.teeBoxPar || 72
                        } as any;
                    }

                    // Map scores
                    const mappedScores = kp.scores.map((s: any) => ({
                        strokes: s.strokes,
                        hole: {
                            holeNumber: s.hole?.holeNumber,
                            difficulty: s.hole?.difficulty
                        }
                    }));

                    // Calculate totals from scores
                    let calculatedGross = 0;
                    let calculatedFront = 0;
                    let calculatedBack = 0;

                    mappedScores.forEach((s: any) => {
                        const scoreVal = s.strokes || 0;
                        calculatedGross += scoreVal;
                        if (s.hole?.holeNumber <= 9) calculatedFront += scoreVal;
                        else if (s.hole?.holeNumber > 9) calculatedBack += scoreVal;
                    });

                    return {
                        ...kp,
                        player: kp.player || { name: kp.guestName || 'Guest', id: kp.playerId || kp.id },
                        teeBox: teeBox,
                        scores: mappedScores,
                        grossScore: calculatedGross > 0 ? calculatedGross : (kp.grossScore || null),
                        frontNine: calculatedFront > 0 ? calculatedFront : (kp.frontNine || null),
                        backNine: calculatedBack > 0 ? calculatedBack : (kp.backNine || null),
                        // Explicitly pass the stored course_handicap so we don't need to recalculate incorrectly
                        stored_handicap: kp.courseHandicap
                    };
                });

                round = {
                    ...liveRound,
                    course: course,
                    players: players,
                    isTournament: false
                } as any;
            }
        }

        if (!round) {
            return { success: false, error: 'Round not found' };
        }

        // Normalize scores for standard rounds too
        round.players = round.players.map((p: any) => {
            let gross = p.grossScore;
            let front = p.frontNine;
            let back = p.backNine;

            if (gross === null || front === null || back === null || gross === 0 || front === 0 || back === 0) {
                const scores = p.scores || [];
                if (scores.length > 0) {
                    let g = 0; let f = 0; let b = 0;
                    scores.forEach((s: any) => {
                        const val = Number(s.strokes);
                        if (!isNaN(val)) {
                            g += val;
                            if (s.hole && s.hole.holeNumber <= 9) f += val;
                            else if (s.hole && s.hole.holeNumber > 9) b += val;
                        }
                    });
                    if (g > 0 && (gross === null || gross === 0)) gross = g;
                    if (f > 0 && (front === null || front === 0)) front = f;
                    if (b > 0 && (back === null || back === 0)) back = b;
                }
            }

            return {
                ...p,
                grossScore: gross,
                frontNine: front,
                backNine: back
            };
        });

        // Pool status map
        let poolStatusMap = new Map<string, boolean>();
        if (isLiveRound) {
            console.log(`Populating pool status for Live Round ${round.id}`);
            round.players.forEach((p: any) => {
                const key = p.playerId || p.id;
                // Explicitly check for false/0/ '0' values to allow deselection
                const status = p.inPool === true;

                // Logging for Craig to debug his status specifically
                if (p.player?.name?.includes('Craig')) {
                    console.log(`  DEBUG: Player ${p.player.name} (${key}): inPool=${p.inPool}, status=${status}`);
                }

                poolStatusMap.set(key, status);
            });
        } else {
            console.log(`Populating pool status for Standard Round ${round.id}`);
            // Use round.players which we already have, instead of raw query which might mismatch or have sync issues
            poolStatusMap = new Map(round.players.map((p: any) => {
                const status = (p as any).inPool === true;
                return [(p as any).playerId, status] as [string, boolean];
            }));
        }

        // Round Selector - Include both Standard and Live rounds
        const [allRoundsRaw, liveRoundsRaw] = await Promise.all([
            prisma.round.findMany({
                orderBy: { date: 'desc' },
                take: 20,
                select: { date: true, id: true, isTournament: true, name: true, courseId: true, _count: { select: { players: true } } }
            }),
            prisma.liveRound.findMany({
                orderBy: { date: 'desc' },
                take: 10,
                select: { date: true, id: true, name: true, courseId: true, _count: { select: { players: true } } }
            })
        ]);

        const combinedRounds = [
            ...allRoundsRaw.map(r => ({ ...r, isLive: false })),
            ...liveRoundsRaw.map(r => ({ ...r, isTournament: false, isLive: true }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Deduplicate rounds by date + course, prioritizing standard rounds over live rounds
        const deduplicatedRounds = [];
        const seenKeys = new Map<string, number>(); // key -> index in deduplicatedRounds

        for (const round of combinedRounds) {
            const dateKey = round.date.substring(0, 10); // YYYY-MM-DD
            const key = `${dateKey}-${round.courseId || 'unknown'}`;

            if (!seenKeys.has(key)) {
                // First time seeing this date/course combo
                seenKeys.set(key, deduplicatedRounds.length);
                deduplicatedRounds.push(round);
            } else {
                // We've seen this date/course combo before
                const existingIdx = seenKeys.get(key)!;
                const existing = deduplicatedRounds[existingIdx];

                // Replace live round with standard round if current is standard
                if (!round.isLive && existing.isLive) {
                    deduplicatedRounds[existingIdx] = round;
                }
                // Otherwise, keep the existing one (standard rounds are prioritized)
            }
        }

        // Calculate allPoolParticipants early so we can use its length
        const playersRaw = round.players as any[];
        const allPoolParticipants = playersRaw.filter((rp: any) => poolStatusMap.get(rp.playerId || rp.id) === true);

        // Ensure current round is in the list
        if (!deduplicatedRounds.find(r => r.id === round.id)) {
            deduplicatedRounds.unshift({
                id: round.id,
                date: round.date,
                name: round.name,
                courseId: (round as any).courseId,
                isTournament: (round as any).isTournament || false,
                _count: { players: allPoolParticipants.length }, // Use pool participant count here
                isLive: isLiveRound
            } as any);
        } else {
            // Update the count for the current round in the combined list
            const currentRoundIdx = deduplicatedRounds.findIndex(r => r.id === round.id);
            if (currentRoundIdx !== -1) {
                deduplicatedRounds[currentRoundIdx]._count = { players: allPoolParticipants.length };
            }
        }

        const formattedRounds = deduplicatedRounds.map(r => ({
            ...r,
            name: r.name ? r.name : (r.isLive ? 'Live Round' : 'Round')
        }));

        const poolActivePlayers = allPoolParticipants;

        const entries = allPoolParticipants.length;
        const entryFee = 5.00;
        const totalPot = allPoolParticipants.length * entryFee;
        const flights = [{ name: "All Players", players: poolActivePlayers, pot: totalPot }];
        const coursePar = (round as any).course?.holes.reduce((sum: number, h: any) => sum + h.par, 0) || 72;

        const calc = (rp: any) => {
            // PRIORITY: If we have a stored handicap (from LiveRoundPlayer), use it.
            // Otherwise, calculate it from index and tee box.
            let courseHcp = rp.stored_handicap ?? rp.courseHandicap;

            if (courseHcp === undefined || courseHcp === null) {
                const index = rp.indexAtTime ?? rp.player.handicapIndex;

                // FALLBACK: Use player's preferred tee box if the round one is missing
                let effectiveTeeBox = rp.teeBox;
                if (!effectiveTeeBox && rp.player?.preferredTeeBox && (round as any).course?.teeBoxes) {
                    effectiveTeeBox = (round as any).course.teeBoxes.find((t: any) =>
                        t.name.toLowerCase().trim() === rp.player.preferredTeeBox.toLowerCase().trim()
                    );
                }

                const slope = effectiveTeeBox?.slope || 113;
                const rating = effectiveTeeBox?.rating || coursePar;
                courseHcp = Math.round((index * (slope / 113)) + (rating - coursePar));
            }

            let frontGross = rp.frontNine;
            let backGross = rp.backNine;

            if (!frontGross || !backGross) {
                const scores = rp.scores || [];
                const f = scores.filter((s: any) => s.hole?.holeNumber <= 9).reduce((sum: number, s: any) => sum + (s.strokes || 0), 0);
                const b = scores.filter((s: any) => s.hole?.holeNumber > 9).reduce((sum: number, s: any) => sum + (s.strokes || 0), 0);
                if (f > 0) frontGross = f;
                if (b > 0) backGross = b;
            }

            frontGross = frontGross ?? Math.floor((rp.grossScore || 0) / 2);
            backGross = backGross ?? Math.ceil((rp.grossScore || 0) / 2);
            const totalGross = rp.grossScore || (frontGross + backGross);

            let frontHcp = 0;
            let backHcp = 0;

            if ((round as any).course?.holes && (round as any).course.holes.length > 0) {
                (round as any).course.holes.forEach((h: any) => {
                    const diff = h.difficulty || 18;
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

            return {
                id: rp.player.id,
                name: rp.player.name,
                courseHcp,
                frontHcp,
                backHcp,
                frontGross,
                backGross,
                totalGross,
                frontNet: frontGross - frontHcp,
                backNet: backGross - backHcp,
                totalNet: totalGross - courseHcp,
                grossHoleScores: (rp.scores || []).map((s: any) => ({
                    holeNumber: s.hole?.holeNumber,
                    difficulty: s.hole?.difficulty || 18,
                    grossScore: s.strokes
                })).sort((a: any, b: any) => a.difficulty - b.difficulty)
            };
        };

        const processedFlights = flights.map((f: any) => {
            const results = f.players.map(calc);
            const potFront = f.pot * 0.40;
            const potBack = f.pot * 0.40;
            const potTotal = f.pot * 0.20;

            const getWinners = (category: 'frontNet' | 'backNet' | 'totalNet', pot: number) => {
                if (results.length === 0 || pot <= 0) return [];
                const sorted = [...results].sort((a: any, b: any) => {
                    if (a[category] !== b[category]) return a[category] - b[category];
                    const filter = (h: any) => (category === 'frontNet' ? h.holeNumber <= 9 : category === 'backNet' ? h.holeNumber > 9 : true);
                    const aHoles = a.grossHoleScores.filter(filter);
                    const bHoles = b.grossHoleScores.filter(filter);
                    for (let i = 0; i < aHoles.length; i++) {
                        if (aHoles[i]?.grossScore !== bHoles[i]?.grossScore) return (aHoles[i]?.grossScore || 9) - (bHoles[i]?.grossScore || 9);
                    }
                    return 0;
                });

                const percentages = [0.5, 0.3, 0.2];
                const finalWinners: any[] = [];
                let prizeIndex = 0;
                let i = 0;
                while (prizeIndex < percentages.length && i < sorted.length) {
                    const currentScore = sorted[i][category];
                    const currentGrossHoles = sorted[i].grossHoleScores;
                    const ties = sorted.slice(i).filter((r: any) => r[category] === currentScore && JSON.stringify(r.grossHoleScores) === JSON.stringify(currentGrossHoles));
                    const count = ties.length;
                    let combinedPct = 0;
                    for (let j = 0; j < count; j++) { if (prizeIndex + j < percentages.length) combinedPct += percentages[prizeIndex + j]; }
                    const payout = (pot * combinedPct) / count;
                    if (payout > 0) {
                        ties.forEach((t: any) => finalWinners.push({
                            ...t,
                            score: t[category],
                            gross: category === 'frontNet' ? t.frontGross : category === 'backNet' ? t.backGross : t.totalGross,
                            amount: payout,
                            position: prizeIndex + 1
                        }));
                    }
                    prizeIndex += count;
                    i += count;
                }
                return finalWinners;
            };

            return {
                ...f,
                frontWinners: getWinners('frontNet', potFront),
                backWinners: getWinners('backNet', potBack),
                totalWinners: getWinners('totalNet', potTotal),
                pots: { front: potFront, back: potBack, total: potTotal }
            };
        });

        const winningsMap = new Map<string, number>();
        processedFlights.forEach((f: any) => {
            [...f.frontWinners, ...f.backWinners, ...f.totalWinners].forEach((w: any) => {
                const current = winningsMap.get(w.name) || 0;
                winningsMap.set(w.name, current + w.amount);
            });
        });

        return {
            success: true,
            data: {
                allPoolParticipants: allPoolParticipants.map(p => {
                    const pid = p.playerId || p.id;
                    return {
                        playerId: pid,
                        player: { id: pid, name: p.player?.name || p.guestName || 'Guest' }
                    };
                }),
                poolActivePlayers: poolActivePlayers.map(p => {
                    const pid = p.playerId || p.id;
                    return {
                        playerId: pid,
                        player: { id: pid, name: p.player?.name || p.guestName || 'Guest' }
                    };
                }),
                round: {
                    id: round.id,
                    date: round.date,
                    name: round.name,
                    isTournament: round.isTournament,
                    players: round.players.map((rp: any) => {
                        const pid = rp.playerId || rp.id;
                        return {
                            id: rp.id, // Internal PK
                            playerId: pid, // Player identifier used for pool
                            player: { id: pid, name: rp.player?.name || rp.guestName || 'Guest' }
                        };
                    })
                },
                flights,
                processedFlights,
                winningsMap: Object.fromEntries(winningsMap),
                winningsArray: Array.from(winningsMap.entries()),
                allRounds: formattedRounds
            }
        };

    } catch (e) {
        console.error('Error in getPoolResults:', e);
        return { success: false, error: 'Internal server error' };
    }
}
