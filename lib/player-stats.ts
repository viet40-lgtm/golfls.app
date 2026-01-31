/**
 * Shared utility for calculating player statistics
 * Used across Scores, Pool, and other components to ensure consistency
 */

export interface PlayerStatsInput {
    grossScore: number | null;
    indexAtTime: number | null;
    player: {
        handicapIndex: number;
        preferredTeeBox?: string | null;
    };
    teeBox?: {
        slope: number;
        rating: number;
    } | null;
    scores?: Array<{
        strokes: number;
        hole: {
            holeNumber: number;
            difficulty?: number | null;
        };
    }>;
}

export interface CourseData {
    teeBoxes?: Array<{
        name: string;
        slope: number;
        rating: number;
    }>;
}

export interface PlayerStats {
    courseHandicap: number;
    netTotal: number;
    slope: number;
    rating: number;
    grossHoleScores: Array<{
        holeNumber: number;
        difficulty: number;
        grossScore: number;
    }>;
}

/**
 * Calculate comprehensive player statistics including course handicap and net score
 */
export function calculatePlayerStats(
    rp: PlayerStatsInput,
    course: CourseData,
    par: number
): PlayerStats {
    const idxBefore = rp.indexAtTime ?? rp.player?.handicapIndex ?? 0;

    // Use assigned tee box first, fall back to player's preferred tee if missing
    let activeTee = rp.teeBox;

    if (!activeTee && rp.player?.preferredTeeBox && course.teeBoxes) {
        activeTee = course.teeBoxes.find((tb) =>
            tb.name.toLowerCase() === rp.player.preferredTeeBox!.toLowerCase()
        ) || null;
    }

    const slope = activeTee?.slope ?? 113;
    const rating = activeTee?.rating ?? par;
    const courseHandicap = Math.round((idxBefore * (slope / 113)) + (rating - par));
    const netTotal = (rp.grossScore ?? 999) - courseHandicap;

    // Calculate Gross Hole Scores for Tie Breaker (sorted by difficulty)
    const scores = rp.scores || [];
    const grossHoleScores = scores.map((s) => {
        const h = s.hole;
        const diff = h?.difficulty || 18;

        return {
            holeNumber: h?.holeNumber || 0,
            difficulty: diff,
            grossScore: s.strokes
        };
    }).sort((a, b) => a.difficulty - b.difficulty);

    return { courseHandicap, netTotal, slope, rating, grossHoleScores };
}

/**
 * Calculate course handicap after a round (for index_after)
 */
export function calculateCourseHandicapAfter(
    indexAfter: number | null,
    indexBefore: number,
    slope: number,
    rating: number,
    par: number
): number {
    if (typeof indexAfter !== 'number') {
        return Math.round((indexBefore * (slope / 113)) + (rating - par));
    }

    const calculated = Math.round((indexAfter * (slope / 113)) + (rating - par));
    return isNaN(calculated)
        ? Math.round((indexBefore * (slope / 113)) + (rating - par))
        : calculated;
}

/**
 * Compare two players for sorting (Net Score + Tie Breaker)
 */
export function comparePlayers(
    a: PlayerStatsInput,
    b: PlayerStatsInput,
    course: CourseData,
    par: number
): number {
    const statsA = calculatePlayerStats(a, course, par);
    const statsB = calculatePlayerStats(b, course, par);

    // 1. Primary: Net Score
    if (statsA.netTotal !== statsB.netTotal) {
        return statsA.netTotal - statsB.netTotal;
    }

    // 2. Tie Breaker: Hardest Holes by Gross Score (1, 2, 3...)
    const aHoles = statsA.grossHoleScores;
    const bHoles = statsB.grossHoleScores;

    if (aHoles.length === 0 || bHoles.length === 0) return 0;

    // Find first difference in hole score (sorted by difficulty)
    for (let i = 0; i < Math.min(aHoles.length, bHoles.length); i++) {
        if (aHoles[i].grossScore !== bHoles[i].grossScore) {
            return aHoles[i].grossScore - bHoles[i].grossScore;
        }
    }

    return 0;
}
