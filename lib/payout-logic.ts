// One Round tournament:  1st $35, 2nd $25, 3rd $15 per flight
// Multi Round tournament: 1st $40, 2nd $30, 3rd $20 per flight
const ONE_ROUND_PAYOUTS = [35, 25, 15];
const MULTI_ROUND_PAYOUTS = [40, 30, 20];

export function calculateTourneyPayouts(
    round: any,
    isMultiRound: boolean
): Map<string, number> {
    const tourneyWinnings = new Map<string, number>();
    const payouts = isMultiRound ? MULTI_ROUND_PAYOUTS : ONE_ROUND_PAYOUTS;
    const par = round.course.holes.reduce((sum: number, h: any) => sum + h.par, 0);

    // Sort players by handicap index to split into flights
    const sortedByIdx = [...round.players].sort((a: any, b: any) => {
        const idxA = a.indexAtTime ?? a.player?.index ?? 0;
        const idxB = b.indexAtTime ?? b.player?.index ?? 0;
        return idxA - idxB;
    });

    if (sortedByIdx.length === 0) return tourneyWinnings;

    const half = Math.ceil(sortedByIdx.length / 2);
    const flights = [sortedByIdx.slice(0, half), sortedByIdx.slice(half)];

    for (const flight of flights) {
        // Score players by net score
        const scored = flight
            .filter((rp: any) => rp.grossScore != null)
            .map((rp: any) => {
                const idx = rp.indexAtTime ?? rp.player?.index ?? 0;
                const slope = rp.teeBox?.slope ?? rp.teeBoxSlope ?? 113;
                const rating = rp.teeBox?.rating ?? rp.teeBoxRating ?? par;
                const ch = Math.round(idx * (slope / 113) + (rating - par));
                return { id: rp.playerId, net: rp.grossScore - ch };
            })
            .sort((a: any, b: any) => a.net - b.net);

        // Assign payouts by rank
        scored.forEach((p: any, rank: number) => {
            const amt = payouts[rank] ?? 0;
            if (amt > 0) {
                tourneyWinnings.set(p.id, amt);
            }
        });
    }

    return tourneyWinnings;
}

export function calculatePoolWinnings(round: any): Map<string, number> {
    const poolWinnings = new Map<string, number>();
    const allPoolParticipants = round.players.filter((rp: any) => rp.inPool);

    if (allPoolParticipants.length === 0) return poolWinnings;

    const entryFee = 5.00;
    const totalPot = allPoolParticipants.length * entryFee;
    const coursePar = round.course?.holes.reduce((sum: number, h: any) => sum + h.par, 0) || 72;

    const results = allPoolParticipants.map((rp: any) => {
        // PRIORITY: If we have a stored handicap (from LiveRoundPlayer or RoundPlayer), use it.
        // Otherwise, calculate it from index and tee box.
        let courseHcp = rp.courseHandicap; // Note: In Recalculate context, we should trust stored or index

        if (courseHcp === undefined || courseHcp === null) {
            const index = rp.indexAtTime ?? rp.player?.index ?? 0;
            const slope = rp.teeBox?.slope ?? rp.teeBoxSlope ?? 113;
            const rating = rp.teeBox?.rating ?? rp.teeBoxRating ?? coursePar;
            courseHcp = Math.round((index * (slope / 113)) + (rating - coursePar));
        }

        const frontGross = rp.frontNine ?? Math.floor((rp.grossScore || 0) / 2);
        const backGross = rp.backNine ?? Math.ceil((rp.grossScore || 0) / 2);
        const totalGross = rp.grossScore || (frontGross + backGross);

        let frontHcp = 0;
        let backHcp = 0;

        if (round.course?.holes && round.course.holes.length > 0) {
            round.course.holes.forEach((h: any) => {
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
            id: rp.playerId,
            name: rp.player?.name,
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
                difficulty: s.hole?.difficulty || (s.holeNumber ? 18 : 18), // fallback
                grossScore: s.strokes
            })).sort((a: any, b: any) => a.difficulty - b.difficulty)
        };
    });

    const potFront = totalPot * 0.40;
    const potBack = totalPot * 0.40;
    const potTotal = totalPot * 0.20;

    const getWinners = (category: 'frontNet' | 'backNet' | 'totalNet', pot: number) => {
        if (results.length === 0 || pot <= 0) return [];
        const sorted = [...results].sort((a: any, b: any) => {
            if (a[category] !== b[category]) return a[category] - b[category];
            const filter = (h: any) => (category === 'frontNet' ? h.holeNumber <= 9 : category === 'backNet' ? h.holeNumber > 9 : true);
            const aHoles = a.grossHoleScores.filter(filter).sort((x: any, y: any) => x.difficulty - y.difficulty);
            const bHoles = b.grossHoleScores.filter(filter).sort((x: any, y: any) => x.difficulty - y.difficulty);

            // Tie-breaker: compare scores on hardest holes first
            for (let i = 0; i < aHoles.length; i++) {
                if (aHoles[i]?.grossScore !== bHoles[i]?.grossScore) {
                    return (aHoles[i]?.grossScore || 9) - (bHoles[i]?.grossScore || 9);
                }
            }
            return 0;
        });

        const percentages = [0.5, 0.3, 0.2];
        const winners: any[] = [];
        let prizeIndex = 0;
        let i = 0;
        while (prizeIndex < percentages.length && i < sorted.length) {
            const currentScore = sorted[i][category];
            const currentGrossHolesStr = JSON.stringify(sorted[i].grossHoleScores.sort((x: any, y: any) => x.difficulty - y.difficulty));

            const ties = sorted.slice(i).filter((r: any) =>
                r[category] === currentScore &&
                JSON.stringify(r.grossHoleScores.sort((x: any, y: any) => x.difficulty - y.difficulty)) === currentGrossHolesStr
            );

            const count = ties.length;
            let combinedPct = 0;
            for (let j = 0; j < count; j++) {
                if (prizeIndex + j < percentages.length) combinedPct += percentages[prizeIndex + j];
            }
            const payout = (pot * combinedPct) / count;
            if (payout > 0) {
                ties.forEach((t: any) => winners.push({ id: t.id, amount: payout }));
            }
            prizeIndex += count;
            i += count;
        }
        return winners;
    };

    const frontWinners = getWinners('frontNet', potFront);
    const backWinners = getWinners('backNet', potBack);
    const totalWinners = getWinners('totalNet', potTotal);

    [...frontWinners, ...backWinners, ...totalWinners].forEach(w => {
        const current = poolWinnings.get(w.id) || 0;
        poolWinnings.set(w.id, current + w.amount);
    });

    return poolWinnings;
}
