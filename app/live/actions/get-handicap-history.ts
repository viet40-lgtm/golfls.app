'use server';

import { prisma } from '@/lib/prisma';
import { calculateHandicap, HandicapInput, calculateScoreDifferential } from '@/lib/handicap';

export interface HandicapHistoryItem {
    id: string;
    date: string;
    type: 'V2' | 'V3';
    teeColor?: string;
    gross?: number;
    adjusted?: number;
    rating?: number;
    slope?: number;
    par?: number;
    differential: number;
    indexBefore: number;
    indexAfter: number;
    used: boolean;
    isLowHi: boolean;
    isSoftCapped: boolean;
    isHardCapped: boolean;
    usedForCurrent?: boolean;
}

export interface HandicapHistoryResponse {
    player: {
        id: string;
        name: string;
        currentIndex: number;
        lowIndex: number | null;
        preferredTee: string | null;
    };
    courseData: {
        name: string;
        par: number;
        tees: {
            name: string;
            rating: number;
            slope: number;
        }[];
    };
    history: HandicapHistoryItem[];
}

export async function getHandicapHistory(playerId: string): Promise<HandicapHistoryResponse> {

    // 1. Fetch Player
    const player = await (prisma.player as any).findUnique({
        where: { id: playerId },
    });
    if (!player) throw new Error('Player not found');

    // 2. Fetch Course Data (Main Course: City Park North)
    const course = await (prisma.course as any).findFirst({
        where: {
            name: {
                contains: 'North',
                mode: 'insensitive'
            }
        },
        include: { teeBoxes: true, holes: true }
    });

    const coursePar = course?.holes.reduce((sum: number, h: { par: number }) => sum + h.par, 0) || 72;
    const tees = course?.teeBoxes.map((t: { name: string; rating: number; slope: number }) => ({ name: t.name, rating: t.rating, slope: t.slope })) || [];

    // 3. Fetch All Rounds (V2 + V3)
    const v2Rounds = (prisma as any).handicapRound
        ? await (prisma as any).handicapRound.findMany({ where: { playerId: playerId } })
        : [];

    const v3Rounds = await (prisma as any).roundPlayer.findMany({
        where: {
            playerId: playerId,
            grossScore: { gte: 1 },
        },
        include: {
            round: {
                include: {
                    course: {
                        include: {
                            holes: true
                        }
                    }
                }
            },
            teeBox: true
        }
    });

    // 4. Normalize & Sort (Ascending for calculation)
    const preferredTeeName = player.preferredTeeBox;

    let allRounds = [
        ...v2Rounds.map((r: any) => ({
            id: r.id,
            date: r.datePlayed,
            type: 'V2' as const,
            differential: r.scoreDifferential,
            gross: r.grossScore || undefined,
            adjusted: undefined,
            teeColor: preferredTeeName,
            rating: undefined, // Will use calc below if needed
            slope: undefined,
            par: coursePar,
        })),
        ...v3Rounds.map((r: any) => {
            const rating = r.teeBoxRating ?? r.teeBox?.rating ?? 72;
            const slope = r.teeBoxSlope ?? r.teeBox?.slope ?? 113;
            const parFromHoles = r.round?.course?.holes?.reduce((sum: number, h: any) => sum + h.par, 0);
            const par = r.teeBoxPar ?? parFromHoles ?? coursePar;
            const teeName = r.tee_box_name ?? r.teeBox?.name;

            const adjustedScore = r.adjustedGrossScore || r.grossScore!;
            const diff = calculateScoreDifferential(adjustedScore, rating, slope);

            return {
                id: r.id,
                date: r.round.date,
                type: 'V3' as const,
                differential: diff,
                gross: r.grossScore!,
                adjusted: adjustedScore,
                teeColor: teeName,
                rating,
                slope,
                par,
            };
        })
    ];

    // Sort Ascending (Oldest First) to build history
    allRounds.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 5. Calculate Rolling History
    const historyWithIndex: HandicapHistoryItem[] = [];
    const windowRounds: HandicapInput[] = [];

    for (let i = 0; i < allRounds.length; i++) {
        const round = allRounds[i];
        const roundDate = new Date(round.date);

        // Calculate Dynamic Low Index for THIS round (12 month window)
        const oneYearPrior = new Date(roundDate);
        oneYearPrior.setFullYear(oneYearPrior.getFullYear() - 1);

        let dynamicLowIndex: number | null = null;
        for (let j = 0; j < historyWithIndex.length; j++) {
            const pastRoundItem = historyWithIndex[j];
            const pastRoundDate = new Date(pastRoundItem.date);
            if (pastRoundDate >= oneYearPrior && pastRoundDate < roundDate) {
                if ((j + 1) >= 20) {
                    const val = pastRoundItem.indexAfter;
                    if (dynamicLowIndex === null || val < dynamicLowIndex) {
                        dynamicLowIndex = val;
                    }
                }
            }
        }

        const calcBefore = calculateHandicap(windowRounds, dynamicLowIndex);
        const indexBefore = calcBefore.handicapIndex;

        const input: HandicapInput = {
            id: round.id,
            date: round.date,
            differential: round.differential,
            score: round.adjusted || round.gross,
            par: round.par,
        };
        windowRounds.push(input);

        const calcAfter = calculateHandicap(windowRounds, dynamicLowIndex);
        const indexAfter = calcAfter.handicapIndex;

        const used = calcAfter.differentials.some(d => d.id === round.id && d.used);

        historyWithIndex.push({
            ...round,
            indexBefore,
            indexAfter,
            used,
            isLowHi: false,
            isSoftCapped: calcAfter.isSoftCapped,
            isHardCapped: calcAfter.isHardCapped
        });
    }

    // Pass 2: Mark Low HI round within last 12 months
    const targetLowIndex = player.lowHandicapIndex ?? null;
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    if (targetLowIndex !== null) {
        let latestLowHiIndex = -1;
        for (let i = 0; i < historyWithIndex.length; i++) {
            const r = historyWithIndex[i];
            if (new Date(r.date) >= twelveMonthsAgo) {
                if (Math.abs(r.indexAfter - targetLowIndex) < 0.1) {
                    latestLowHiIndex = i;
                }
            }
        }
        if (latestLowHiIndex !== -1) {
            historyWithIndex[latestLowHiIndex].isLowHi = true;
        }
    }

    // Pass 3: CURRENT index usage
    const finalCalc = calculateHandicap(allRounds, targetLowIndex);
    const finalUsedIds = new Set(finalCalc.differentials.filter(d => d.used).map(d => d.id));

    historyWithIndex.reverse();
    const finalHistory = historyWithIndex.map(item => ({
        ...item,
        usedForCurrent: finalUsedIds.has(item.id)
    }));

    return {
        player: {
            id: player.id,
            name: player.name,
            currentIndex: finalCalc.handicapIndex,
            lowIndex: targetLowIndex,
            preferredTee: player.preferredTeeBox ?? null
        },
        courseData: {
            name: course?.name || 'City Park North',
            par: coursePar,
            tees
        },
        history: finalHistory
    };
}
