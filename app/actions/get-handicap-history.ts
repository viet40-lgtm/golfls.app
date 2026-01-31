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
    };
    courseData: {
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
    const player = await prisma.player.findUnique({
        where: { id: playerId },
    });
    if (!player) throw new Error('Player not found');

    // 2. Fetch Course Data (Main Course: City Park North)
    const course = await prisma.course.findFirst({
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

    // 3. Fetch Rounds (V3/Current Schema Only)
    // Note: Historical V2 rounds (handicapRound table) have been removed in the latest schema.
    const rounds = await prisma.roundPlayer.findMany({
        where: {
            playerId: playerId,
            grossScore: { not: null }, // Only completed rounds
        },
        include: {
            round: true,
            teeBox: true
        }
    });

    // 4. Normalize & Sort (Ascending for calculation)
    let allRounds = rounds.map(r => {
        const teeBox = r.teeBox;
        const rating = teeBox.rating;
        const slope = teeBox.slope;
        const par = teeBox.par || coursePar;

        // Use grossScore as adjusted since Net Double Bogey logic is not fully implemented in DB yet
        const adjustedScore = r.grossScore!; // Verified not null by query

        const diff = calculateScoreDifferential(adjustedScore, rating, slope);

        return {
            id: r.id,
            date: r.round.date,
            type: 'V3' as const,
            differential: diff,
            gross: r.grossScore!,
            adjusted: adjustedScore,
            teeColor: teeBox.name,
            rating,
            slope,
            par,
        };
    });

    // Sort Ascending (Oldest First) to build history
    allRounds.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 5. Calculate Rolling History
    const historyWithIndex: HandicapHistoryItem[] = [];
    const windowRounds: HandicapInput[] = [];

    // Low Handicap Index logic is not currently persisted in the new schema. 
    // We will pass null for now, which disables capping logic based on Low HI.
    const storedLowIndex: number | null = null;

    for (const round of allRounds) {
        // State BEFORE this round (using rounds 0 to n-1)
        const calcBefore = calculateHandicap(windowRounds, storedLowIndex);
        const indexBefore = calcBefore.handicapIndex;

        // Add current round to window
        const input: HandicapInput = {
            id: round.id,
            date: round.date,
            differential: round.differential,
        };
        windowRounds.push(input);

        // State AFTER this round (using rounds 0 to n)
        const calcAfter = calculateHandicap(windowRounds, storedLowIndex);
        const indexAfter = calcAfter.handicapIndex;

        // Did this specific round count towards the NEW index?
        const used = calcAfter.differentials.some(d => d.id === round.id && d.used);

        // Get cap flags from calculation
        const isSoftCapped = calcAfter.isSoftCapped;
        const isHardCapped = calcAfter.isHardCapped;

        historyWithIndex.push({
            ...round,
            indexBefore,
            indexAfter,
            used,
            isLowHi: false, // Low HI tracking is temporarily disabled
            isSoftCapped,
            isHardCapped
        });
    }

    // Pass 2: Mark Low HI (Disabled for now as we don't store Low HI)
    // logic removed

    // 6. Determine which rounds are used for the CURRENT index
    const finalCalc = calculateHandicap(allRounds, storedLowIndex);
    const finalUsedIds = new Set(
        finalCalc.differentials
            .filter(d => d.used)
            .map(d => d.id)
    );

    // 7. Reverse for Display (Newest First) and attach current usage info
    historyWithIndex.reverse();

    // Map usage to the history items
    const finalHistory = historyWithIndex.map(item => ({
        ...item,
        usedForCurrent: finalUsedIds.has(item.id)
    }));

    return {
        player: {
            id: player.id,
            name: player.name,
            currentIndex: finalCalc.handicapIndex,
            lowIndex: storedLowIndex
        },
        courseData: {
            par: coursePar,
            tees
        },
        history: finalHistory
    };
}
