import { differenceInYears } from 'date-fns';

export interface Round {
    id: string;
    date: string; // ISO string 'YYYY-MM-DD'
    score: number; // Gross Score
    rating: number;
    slope: number;
    pcc?: number; // Playing Conditions Calculation (default 0)
}

export interface DifferentialRound {
    id: string;
    date: string;
    differential: number;
}

export type HandicapInput = Round | DifferentialRound;

export interface Differential {
    id: string;
    date: string;
    value: number;
    used: boolean; // if it was used in the calculation
}

export interface CalculationResult {
    handicapIndex: number;
    differentials: Differential[];
    lowHandicapIndex?: number;
    isSoftCapped: boolean;
    isHardCapped: boolean;
}

/**
 * Calculates the Score Differential for a single round.
 * Formula: (113 / Slope Rating) * (Adjusted Gross Score - Course Rating - PCC)
 */
export function calculateScoreDifferential(
    grossScore: number,
    rating: number,
    slope: number,
    pcc: number = 0
): number {
    // USGA Formula: ((Adjusted Gross Score - Course Rating) * 113) / Slope Rating
    const diff = ((grossScore - rating - pcc) * 113) / slope;
    // Round to 1 decimal place
    return Number(diff.toFixed(1));
}

/**
 * Determines how many lowest differentials to use based on the number of available rounds.
 * WHS 2020 Logic:
 * ... (No change to comments)
 */
function getDifferentialsConfiguration(count: number): {
    itemsToUse: number;
} {
    if (count < 3) return { itemsToUse: 0 };
    if (count === 3) return { itemsToUse: 1 };
    if (count === 4) return { itemsToUse: 1 };
    if (count === 5) return { itemsToUse: 1 };
    if (count === 6) return { itemsToUse: 2 };
    if (count <= 8) return { itemsToUse: 2 };
    if (count <= 11) return { itemsToUse: 3 };
    if (count <= 14) return { itemsToUse: 4 };
    if (count <= 16) return { itemsToUse: 5 };
    if (count <= 18) return { itemsToUse: 6 };
    if (count === 19) return { itemsToUse: 7 };
    return { itemsToUse: 8 }; // 20+
}

/**
 * Main function to calculate Handicap Index.
 * @param rounds - List of rounds (full or pre-calculated)
 * @param lowHandicapIndex - The player's 12-month Low HI (optional, for capping)
 */
export function calculateHandicap(
    rounds: HandicapInput[],
    lowHandicapIndex: number | null = null
): CalculationResult {
    // 1. Calculate differentials for all rounds
    let allDifferentials: Differential[] = rounds.map((r) => {
        let value: number;
        if ('differential' in r) {
            value = r.differential;
        } else {
            value = calculateScoreDifferential(r.score, r.rating, r.slope, r.pcc);
        }
        return {
            id: r.id,
            date: r.date,
            value,
            used: false,
        };
    });

    // 2. Sort by date descending (Newest first)
    allDifferentials.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 3. Take the most recent 20 scores
    const recentDifferentials = allDifferentials.slice(0, 20);
    const count = recentDifferentials.length;

    if (count < 6) {
        return {
            handicapIndex: 0, // 0 until 6 rounds (WHS uses fewer, but user requested 5+)
            differentials: recentDifferentials,
            isSoftCapped: false,
            isHardCapped: false,
        };
    }

    // 4. Determine how many to use
    const { itemsToUse } = getDifferentialsConfiguration(count);

    // 5. Find the lowest differentials among the recent ones
    // We need to clone to sort without affecting the date order of 'recentDifferentials' if we want to preserve that
    const sortedByValue = [...recentDifferentials].sort((a, b) => a.value - b.value);
    const usedDifferentials = sortedByValue.slice(0, itemsToUse);

    // Mark used
    const usedIds = new Set(usedDifferentials.map(d => d.id));
    recentDifferentials.forEach(d => {
        if (usedIds.has(d.id)) {
            d.used = true;
        }
    });

    // 6. Calculate Average
    const sum = usedDifferentials.reduce((acc, d) => acc + d.value, 0);
    const average = sum / itemsToUse;

    // Round to 1 decimal place (USGA/WHS rules)
    let index = Number(average.toFixed(1));

    // 7. Apply Caps (Soft and Hard)
    // Only applies if user has at least 20 scores? No, WHS says caps apply once 20 scores exist usually,
    // but technically can apply if Low HI is established.
    // We will apply if Low HI is provided.

    let isSoftCapped = false;
    let isHardCapped = false;

    if (lowHandicapIndex !== null) {
        const softCapTrigger = lowHandicapIndex + 3.0;
        const hardCapTrigger = lowHandicapIndex + 5.0;

        if (index > softCapTrigger) {
            isSoftCapped = true;
            // Soft Cap: Suppress 50% of the increase above +3.0
            // Formula: Cap + (Excess / 2)
            // Excess = Index - SoftCapTrigger
            const excess = index - softCapTrigger;
            index = softCapTrigger + (excess / 2);

            // Check Hard Cap
            if (index > hardCapTrigger) {
                isHardCapped = true;
                index = hardCapTrigger;
            }
        }
    }

    return {
        handicapIndex: Number(index.toFixed(1)), // Final rounding for display
        differentials: recentDifferentials,
        lowHandicapIndex: lowHandicapIndex || undefined,
        isSoftCapped,
        isHardCapped,
    };
}
