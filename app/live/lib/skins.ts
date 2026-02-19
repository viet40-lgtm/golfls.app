
export interface SkinHole {
    number: number;
    par: number;
    difficulty: number;
}

export interface SkinPlayer {
    id: string;
    courseHandicap: number;
    scores: Record<number, number>; // hole -> gross
}

export interface SkinResult {
    holeResults: Array<{
        holeNumber: number;
        winnerId: string | null;
        skinValue: number;
        status: 'completed' | 'pending';
        tiedPlayerIds?: string[]; // New field
        ultimateWinnerId?: string; // Back-filled winner of carryover chain
    }>;
    playerTotals: Record<string, { skins: number; winnings: number }>;
    playerStrokes: Record<string, Record<number, number>>;
}

export function calculateSkins(
    players: SkinPlayer[],
    holes: SkinHole[],
    participantIds: string[],
    carryOvers: boolean = true
): SkinResult | null {
    // Filter active participants
    const activePlayers = players.filter(p => participantIds.includes(p.id));
    if (activePlayers.length < 2) return null;

    // 1. Calculate allocated strokes
    const minHandicap = Math.min(...activePlayers.map(p => p.courseHandicap));
    const playerStrokes: Record<string, Record<number, number>> = {};

    activePlayers.forEach(p => {
        const diff = Math.max(0, p.courseHandicap - minHandicap);
        const sortedHoles = [...holes].sort((a, b) => a.difficulty - b.difficulty);
        const allocation: Record<number, number> = {};
        holes.forEach(h => allocation[h.number] = 0);

        let strokesRemaining = diff;
        while (strokesRemaining > 0) {
            for (const hole of sortedHoles) {
                if (strokesRemaining <= 0) break;
                allocation[hole.number]++;
                strokesRemaining--;
            }
        }
        playerStrokes[p.id] = allocation;
    });

    // 2. Process Holes
    const holeResults: SkinResult['holeResults'] = [];
    const baseSkinValue = 1;
    let currentCarryover = 0;
    let pendingHoleIndices: number[] = [];

    // Sort holes by number
    const sortedHoles = [...holes].sort((a, b) => a.number - b.number);

    for (let i = 0; i < sortedHoles.length; i++) {
        const hole = sortedHoles[i];
        const scoresOnHole: Record<string, { net: number }> = {};
        let isHoleComplete = true;

        // Calculate nets
        for (const p of activePlayers) {
            const gross = p.scores[hole.number];
            const strokes = playerStrokes[p.id]?.[hole.number] || 0;

            if (!gross) {
                isHoleComplete = false;
                scoresOnHole[p.id] = { net: 999 };
            } else {
                scoresOnHole[p.id] = { net: gross - strokes };
            }
        }

        let winnerId: string | null = null;
        let tiedPlayerIds: string[] = [];
        let potSize = baseSkinValue + currentCarryover;

        if (isHoleComplete) {
            let minNet = 999;
            let winners: string[] = [];

            activePlayers.forEach(p => {
                const net = scoresOnHole[p.id].net;
                if (net < minNet) {
                    minNet = net;
                    winners = [p.id];
                } else if (net === minNet) {
                    winners.push(p.id);
                }
            });

            if (winners.length === 1) {
                winnerId = winners[0];
                currentCarryover = 0;

                // Back-fill ultimate winner for pending holes
                if (carryOvers) {
                    pendingHoleIndices.forEach(idx => {
                        if (holeResults[idx]) {
                            holeResults[idx].ultimateWinnerId = winnerId!;
                        }
                    });
                }
                pendingHoleIndices = [];
            } else {
                // Tie
                if (carryOvers) {
                    currentCarryover += baseSkinValue;
                    pendingHoleIndices.push(i);
                    tiedPlayerIds = winners;
                } else {
                    // No carry over. Pot dies.
                    currentCarryover = 0;
                    tiedPlayerIds = winners;
                }
            }
        } else {
            // Incomplete hole
            if (carryOvers) {
                currentCarryover += baseSkinValue;
                pendingHoleIndices.push(i);
            } else {
                currentCarryover = 0;
            }
        }

        holeResults.push({
            holeNumber: hole.number,
            winnerId,
            skinValue: winnerId ? potSize : 0,
            status: (isHoleComplete ? 'completed' : 'pending') as 'completed' | 'pending',
            tiedPlayerIds: tiedPlayerIds.length > 0 ? tiedPlayerIds : undefined
        });
    }

    // 3. Totals
    const playerTotals: Record<string, { skins: number, winnings: number }> = {};
    activePlayers.forEach(p => playerTotals[p.id] = { skins: 0, winnings: 0 });

    holeResults.forEach(h => {
        if (h.winnerId && playerTotals[h.winnerId]) {
            playerTotals[h.winnerId].skins += h.skinValue;
            playerTotals[h.winnerId].winnings += h.skinValue;
        }
    });

    return { holeResults, playerTotals, playerStrokes };
}
