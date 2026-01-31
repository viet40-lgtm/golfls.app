/**
 * Calculate Adjusted Gross Score according to simple Double Bogey rule.
 * 
 * Maximum hole score = Par + 2
 * Example: Par 5 hole, max score is 7. If you score 10, it's adjusted to 7.
 */

export interface HoleScore {
    holeNumber: number;
    par: number;
    strokes: number;
}

/**
 * Calculate the maximum allowable score for a hole (Double Bogey)
 */
export function calculateMaxHoleScore(par: number): number {
    return par + 2;
}

/**
 * Calculate Adjusted Gross Score for a round
 * Returns both the adjusted score and a list of adjusted holes
 */
export function calculateAdjustedGrossScore(
    holeScores: HoleScore[]
): {
    adjustedGrossScore: number;
    adjustedHoles: { holeNumber: number; original: number; adjusted: number }[];
} {
    let adjustedTotal = 0;
    const adjustedHoles: { holeNumber: number; original: number; adjusted: number }[] = [];

    for (const hole of holeScores) {
        const maxScore = calculateMaxHoleScore(hole.par);

        if (hole.strokes > maxScore) {
            // Score needs adjustment
            adjustedTotal += maxScore;
            adjustedHoles.push({
                holeNumber: hole.holeNumber,
                original: hole.strokes,
                adjusted: maxScore
            });
        } else {
            // Score is within limits
            adjustedTotal += hole.strokes;
        }
    }

    return {
        adjustedGrossScore: adjustedTotal,
        adjustedHoles
    };
}
